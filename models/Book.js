const fs = require('fs')
const path = require('path')
const xml2js = require('xml2js')
const Epub = require('../utils/epub')
const { MIME_TYPE_EPUB, UPLOAD_PATH, UPLOAD_URL, OLD_UPLOAD_URL } = require('../utils/constant')


class Book {
  // 判断
  // 如果是file 表示刚上传一本电子书
  // 如果是data 则是修改电子书，更新或者插入电子书数据
  constructor(file, data) {
    if(file) {
      this.createBookFromFile(file)
    } else if(data) {
      this.createBookFromData(data)
    }
  }

  // 创建图书对象
  createBookFromFile(file) {
    const { 
      filename, // 图书名
      destination, // 图书本地存储目录
      mimetype, // 图书类型
      path, // 图书路径
      originalname,  // 电子书原名
    } = file
    
    const suffix = mimetype === MIME_TYPE_EPUB ? '.epub' : ''  // 后缀名
    const oldBookPath = path  // 图书原有路径
    const bookPath =`${destination}/${filename}${suffix}`  // 图书新路径
    const url = `${UPLOAD_URL}/book/${filename}${suffix}` // 电子书下载路径
    const unzipPath = `${UPLOAD_PATH}/unzip/${filename}`  // 电子书解压的目录路径
    const unzipUrl = `${UPLOAD_URL}/unzip/${filename}`  // 电子书解压的url

    // 创建图书解压后的目录，迭代创建
    if(!fs.existsSync(unzipPath)) {
      fs.mkdirSync(unzipPath, {recursive: true}) 
    }
    // 上传图书成功后，重命名图书文件为.epub
    // 判断上传的图书存在，.epub图书不存在的时候，重命名
    if(fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)){
      fs.renameSync(oldBookPath, bookPath)  // 重命名
    }

    // 图书信息
    this.fileName = filename  // 文件名
    this.path = `/book/${filename}${suffix}` // epub图书路径
    this.filePath = this.path  // epub图书路径
    this.url = url  // epub文件url
    this.unzipPath = `/unzip/${filename}` // 解压后的电子书相对路径目录
    this.unzipUrl = unzipUrl // 解压后的电子书链接
    this.title = ''  // 图书标题
    this.author = '' // 作者
    this.publisher = '' // 出版社
    this.contents = [] // 目录
    this.contentsTree = []  // 树形目录
    this.cover = '' // 封面图片URL
    this.coverPath = '' // 封面路径
    this.category = -1 // 分类ID
    this.categoryText = '' // 分类名称
    this.language = '' // 语种
    this.originalName = originalname  // 图书原名
  }

  // 更新图书
  createBookFromData(data) {
    this.fileName = data.fileName
    this.cover = data.coverPath
    this.title = data.title
    this.author = data.author
    this.publisher = data.publisher
    this.bookId = data.fileName
    this.language = data.language
    this.rootFile = data.rootFile
    this.originalName = data.originalName
    this.path = data.path || data.filePath
    this.filePath = data.path || data.filePath
    this.unzipPath = data.unzipPath
    this.coverPath = data.coverPath
    this.createUser = data.username
    this.createDt = new Date().getTime()
    this.updateDt = new Date().getTime()
    this.updateType = data.updateType === 0 ? data.updateType : 1
    this.category = data.category || 99
    this.categoryText = data.categoryText || '自定义'
    this.contents = data.contents
  }

  // 通过epub库 解析图书
  parse() {
    return new Promise((resolve, reject) => {
      const bookPath = `${UPLOAD_PATH}${this.path}`
      if(!this.path || !fs.existsSync(bookPath)) {
        reject(new Error('电子书不存在！'))
      }

      // 传入电子书路径 ， 进行电子书解析 
      const epub = new Epub(bookPath)
      epub.on('err', err => {
        reject(err)
      })
      epub.on('end', err => {
        if(err){
          reject(err)
        } else {
          // 拿到电子书信息
          const {
            language,
            title,
            cover,
            creator,
            creatorFileAs,
            publisher
          } = epub.metadata

          if(!title) {
            reject('图书标题为空')
          } else {
            this.title = title
            this.language = language || 'en'
            this.author = creator || creatorFileAs || 'unknown'
            this.publisher = publisher || 'unknown'
            this.rootFile = epub.rootFile

            try {
              // 调用解压方法，解压电子书
              this.unzip()
              // 调用解析目录方法，传入epub对象进行目录解析
              this.parseContents(epub).then(({chapters, chapterTree}) => {
                this.contents = chapters
                this.contentsTree = chapterTree
              })
              // 获取封面图片 , 参数： 封面id， 回调
              epub.getImage(cover, (err, file, mimeType) => {
                if(err) {
                  reject(err)
                } else {
                  const suffix = mimeType.split('/')[1]  // 封面图 后缀名
                  // 拼接封面的路径和 url地址
                  const coverPath = `${UPLOAD_PATH}/img/${this.fileName}.${suffix}`
                  const coverUrl = `${UPLOAD_URL}/img/${this.fileName}.${suffix}`
                  // 写入磁盘
                  fs.writeFileSync(coverPath, file, 'binary')
                  // 把封面的路径 赋值给book对象
                  this.cover = coverUrl
                  this.coverPath = `/img/${this.fileName}.${suffix}`
                  // 解析成功后返回该对象
                  resolve(this)
                }
              })
              

            } catch (error) {
              reject(error)
            }
            
            
            
          }
        }
      })
      epub.parse()
      
    })
  }

  // 解压电子书方法 
  unzip() {
    const AdmZip = require('adm-zip')
    const zip = new AdmZip(Book.genPath(this.path))
    zip.extractAllTo(Book.genPath(this.unzipPath), true)

  }

  // 解析图书馆文件目录
  parseContents(epub) {
    // 获取ncx目录文件 
    function getNcxFilePath(params) {
      // 获取epub 骨架架构
      const spine = epub.spine
      const manifest = epub.manifest
      // 目录路径
      const ncx = spine.toc && spine.toc.href
      const id = spine.toc && spine.toc.id
      // 如果路径存在则直接返回 目录路径
      if(ncx) {
        return ncx
      } else {
        // 否则去manifest中查找路径
        return manifest[id].href
      }
    }

    // 遍历多维数组的目录
    function findParent(array, level = 0, pid = '') {
      return array.map(item => {
        item.pid = pid
        item.level = level
        // 如果目录中包含子目录，目录长度大于0 则递归调用
        if(item.navPoint && item.navPoint.length ) {
          item.navPoint = findParent(item.navPoint, level+1, item['$'].id)
        } else if (item.navPoint) {
          // 如果只包含一层，则level+1 表示二级目录 
          item.navPoint.level = level + 1
          item.navPoint.pid = item['$'].id 
        }
        return item
      })
    }

    // 将树状目录结构 变为 一维数组便于展示
    function flatten(array) {
      return [].concat(...array.map(item => {
        if(item.navPoint && item.navPoint.length) {
          // 递归改变数组维度
          return [].concat(item, ...flatten(item.navPoint))
        } else if(item.navPoint) {
          // 把二级目录拼接在一级目录后
          return [].concat(item, item.navPoint)
        } else {
          return item
        }
        
      }))
    }

    // 电子书目录解析算法
    // 获取目录文件绝对地址路径
    const ncxFilePath = Book.genPath(`${this.unzipPath}/${getNcxFilePath()}`)
    if(fs.existsSync(ncxFilePath)) {
      return new Promise((resolve, reject) => {
        // 读取目录文件进行解析
        const xml = fs.readFileSync(ncxFilePath, 'utf-8')
        // 获取ncx 文件路径
        const dir = path.dirname(ncxFilePath).replace(UPLOAD_PATH, '')
        const fileName = this.fileName
        const unzipPath = this.unzipPath
        // 解析文件
        xml2js.parseString(xml, {
          explicitArray: false,
          ignoreAttrs: false
        }, (err, json) => {
          if(err) {
            reject(err)
          } else {
            // 获取解析后的 目录map
            const navMap = json.ncx.navMap
            // 判断 目录结构是否存在
            if(navMap.navPoint && navMap.navPoint.length > 0) {
              // 获取新的目录结构
              navMap.navPoint = findParent(navMap.navPoint)
              // 获取新的目录结构
              const newNavMap = flatten(navMap.navPoint)
              // console.log('nav', newNavMap[0].content['$']);
              // 章节信息
              let chapters = []
              // 遍历章节信息
              newNavMap.forEach((chapter, index) => {
                // 获取章节url
                const src = chapter.content['$'].src
                // 章节id
                chapter.id = `${src}`
                chapter.href = `${dir}/${src}`.replace(unzipPath, '')
                // 拼接章节url
                chapter.text = `${UPLOAD_URL}${dir}/${src}`
                
                // chapter.level = nav.level
                // chapter.pid = nav.pid
                // 目录标题
                chapter.label = chapter.navLabel.text || '' 
                chapter.navId = chapter['$'].id
                chapter.fileName = fileName
                chapter.order = index + 1
                // 目录信息完善后，添加到 目录章节数组中
                chapters.push(chapter)
              })
              // 存放树形目录结构
              let chapterTree = []
              // 遍历目录，发现二级目录转为树形结构
              chapters.forEach(chapterItem => {
                chapterItem.children = []
                // pid 为空是一级目录
                if(chapterItem.pid === '') {
                  chapterTree.push(chapterItem)
                } else {
                  // 不为空则有二级目录
                  let parent = chapters.find(item => item.navId === chapterItem.pid)
                  parent.children.push(chapterItem)
                }
              })

              // 解析成功返回目录信息
              resolve({chapters, chapterTree})
            } else {
              reject(new Error('目录解析失败，目录数为0'))
            }
          }
        })
      })
    } else {
      throw new Error('目录不存在')
    }
  }

 // 返回数据库表中需要的字段
  toDB(){
    return {
      fileName : this.fileName,
      cover : this.coverPath,
      title : this.title,
      author : this.author,
      publisher : this.publisher,
      bookId : this.fileName,
      language : this.language,
      rootFile : this.rootFile,
      originalName : this.originalName,
      filePath : this.filePath,
      unzipPath : this.unzipPath,
      coverPath : this.coverPath,
      createUser : this.createUser,
      createDt : this.createDt,
      updateDt : this.updateDt,
      updateType : this.updateType,
      category : this.category,
      categoryText : this.categoryText
      }
  }

  // 获取图书目录
  getContents() {
    return this.contents
  }

  // 图书已存在，将上传的图书路径下的文件全部 删除
  reset() {
    if(Book.pathExists(this.filePath)) {
      fs.unlinkSync(Book.genPath(this.filePath))
    }
    if(Book.pathExists(this.coverPath)) {
      fs.unlinkSync(Book.genPath(this.coverPath))
    }
    if(Book.pathExists(this.unzipPath)) {
      fs.rmdirSync(Book.genPath(this.unzipPath), {recursive: true})
    }
  }

  // 把电子对的相对路径 优化为绝对路径 
  static genPath(path) {
    if(!path.startsWith('/')){
      path = `/${path}`
    }
    return `${UPLOAD_PATH}${path}`
  }

  // 判断路径是否存在
  static pathExists(path) {
    if(path.startsWith(UPLOAD_PATH)) {
      return fs.existsSync(path)
    } else {
      return fs.existsSync(Book.genPath(path))
    }
  }

  // 生成图片地址
  static genCoverUrl(book) {
    const { cover } = book
    if(+book.updateType === 0) {
      if(cover) {
        if(cover.startsWith('/')) {
          return `${OLD_UPLOAD_URL}${cover}`
        } else {
          return `${OLD_UPLOAD_URL}/${cover}`
        }
      } else {
        return null
      }
    } else {
      if(cover) {
        if(cover.startsWith('/')) {
          return `${UPLOAD_URL}${cover}`
        } else {
          return `${UPLOAD_URL}/${cover}`
        }
      } else {
        return null
      }
    }
    
  }

  // 将目录数据 生成目录树
  static genContentsTree(contents) {
    // const {contents} = book
    if(contents) {
      // 存放树形目录结构
      let contentsTree = []
      // 遍历目录，发现二级目录转为树形结构
      contents.forEach(chapterItem => {
        chapterItem.children = []
        // pid 为空是一级目录
        if(chapterItem.pid === '') {
          contentsTree.push(chapterItem)
        } else {
          // 不为空则有二级目录
          let parent = contents.find(item => item.navId === chapterItem.pid)
          parent.children.push(chapterItem)
        }
      })
      return contentsTree
    }
  }


}

module.exports = Book