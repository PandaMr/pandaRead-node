const Book = require("../models/Book")
const db = require('../db/index')
const _ = require('lodash')
const { debug } = require('../utils/constant')
const { querySql } = require("../db/index")
const { reject } = require("lodash")

// 电子书已存在逻辑
function exists(book){
  // 从图书中获取标题、作者、出版社，如果三者都相同 则图书已经存在数据库中
  const { title, author, publisher } = book
  const sql = `select * from book where title='${title}' and author='${author}' and publisher='${publisher}'`
  return db.queryOne(sql)
}

// 删除电子书
async function removeBook(book) {
  if(book) {
    // 当图书已经存在，则把电子书上传的路径中解析的图书删除
    book.reset()
    // 删除数据库中的图书
    if(book.fileName) {
      let removeBookSql = `delete from book where fileName='${book.fileName}'`
      let removeContentsSql = `delete from contents where fileName='${book.fileName}'`
      await db.querySql(removeBookSql)
      await db.querySql(removeContentsSql)
      console.log('book sql success');
    }
  }
}

// 创建电子书目录
async function insertContents(book) {
  // 获取图书的目录
  const contents = book.getContents()
  // 解析图书的目录, 和数据库中的图书目录字段相对应
  if(contents && contents.length > 0) {
    for(let i=0; i<contents.length; i++) {
      // 从目录对象中 提取自己想要的字段
      let content = _.pick(contents[i], [
        'fileName',
        'id',
        'href',
        'order',
        'level',
        'text',
        'label',
        'pid',
        'navId'
      ])
      await db.insert(content, 'contents')
    }
  }
}

// 将图书插入数据库
function insertBook(book) {
  // 使用async 和 await 将异步操作变为同步操作， 操作数据库许多异步方法 
  return new Promise( async(resolve, reject) => {
    try {
      // 判断传入的book是否为 Book 的实例对象
      if(book instanceof Book) {
        // 判断图书是否已经存在，存在则删除本次上传的图书
        const result = await exists(book)
        if(result) {
          await removeBook(book)
          reject(new Error('图书已存在！'))
        } else {
          // 电子书不存在，则插入电子书
          // 参数： 图书信息， 表名
          await db.insert(book.toDB(), 'book')
          // 插入图书目录
          await insertContents(book)
          resolve()
        }
      } else {
        reject(new Error('添加对象不合法'))
      }
    } catch (error) {
      reject(error)
    }
  })
}

// 编辑图书
function updateBook(book) {
  return new Promise( async (resolve, reject) => {
    try {
      // 判断传入的book 是否为 Book类的实例
      if(book instanceof Book) {
        // 获取图书信息
        let result =await getBook(book.fileName)
        if(result) {
          // 判断是否为内置图书
          if(+result.updateType === 0) {
            reject(new Error('内置图书不能编辑'))
          } else {
            // 将图书信息转为 数据中需要的字段
            let model = book.toDB()
            // 更新图书数据
            await db.update(model, 'book', `where fileName='${book.fileName}'`)
            resolve()
          }
        }
      } else {
        reject(new Error('添加对象不合法'))
      }
    } catch (error) {
      reject(error)
    }
  })
}

// 获取电子书信息
function getBook(fileName) {
  return new Promise( async (resolve, reject) => {
    // 查询mysql语句 获取图书和目录信息
    let bookSql = `select * from book where fileName='${fileName}'`
    let contentsSql = `select * from contents where fileName='${fileName}' order by \`order\``
    let book = await db.queryOne(bookSql)
    let contents = await db.querySql(contentsSql)
    if(book) {
      // 获取图书封面
      book.cover = Book.genCoverUrl(book)
      // 获取目录树
      book.contentsTree = Book.genContentsTree(contents)
      // 成功后返回图书信息
      resolve(book)
    } else {
      reject(new Error('需要从图书列表中选择图书进行编辑'))
    }
  })
}

// 删除电子书
function deleteBook(fileName) {
  return new Promise( async (resolve, reject) => {
    // 删除电子书需要先获取， 判读是不是内置电子书
    let book = await getBook(fileName)
    if(book) {
      if(+book.updateType === 0) {
        reject(new Error('内置图书不能删除'))
      } else {
        // 创建一个图书对象，便于清空服务器中上传的文件
        let bookObj = new Book(null, book)
        let sql = `delete from book where fileName = '${fileName}'`
        db.querySql(sql).then(() => {
          bookObj.reset()
          resolve()
        })
      }
    } else {
      reject(new Error('图书不存在'))
    }
  })
}
// 获取图书分类列表
function getCategory() {
  return new Promise( async (resolve, reject) => {
    let sql = 'select * from category order by category asc'
    let result = await db.querySql(sql)
    let categoryList = []
    result.forEach(item => {
      categoryList.push({
        label: item.categoryText,
        value: item.category,
        num: item.num
      })
    })
    resolve(categoryList)
  })
}

// 获取图书列表
async function listBook(query) {
  console.log(query);
  const { category, title, author, page = 1, pageSize = 20, sort  } = query
  let sql = 'select * from book'
  let where = 'where'
  // 设置查询的偏移量 ，以便分页
  let offset = (page - 1) * pageSize
  // 分类条件，如果传入则按照分类查询，具体逻辑在db中的and方法
  category && (where = db.and(where, 'category', category))
  // 查询标题和作者进行模糊查询
  title && (where = db.andLike(where, 'title', title))
  author && (where = db.andLike(where, 'author', author))
  // 查询条件 分类，标题，作者有可能会不传入，要做判断后在进行查询
  if(where !== 'where'){
    sql = `${sql} ${where}`
  }
  // 排序功能，判断修改sql, 根据传来的升降序 来确定sql
  if(sort) {
    let symbol = sort[0]
    let column = sort.slice(1, sort.length)
    let order = symbol === '+' ? 'asc' : 'desc'
    sql = `${sql} order by \`${column}\` ${order}`
  } 

  // 分页查询sql
  let countSql = 'select count(*) as count from book'
  // 判断有没有查询条件
  if(where !== 'where') {
    countSql = `${countSql} ${where}`
  }
  // 向数据库查找数据，返回图书列表总数
  let count = await db.querySql(countSql)
  console.log(count);
  // sql查询语句 设置查询的数量
  sql = `${sql} limit ${pageSize} offset ${offset}`
  // 向数据库查询数据，返回图书列表
  let list = await db.querySql(sql)
  // 修改图书封面路径
  list.forEach(book => {
    book.cover = Book.genCoverUrl(book)
  })
  // async await 中返回的数据会自动转为Promise
  return { list, count: count[0].count, page, pageSize }
  // return new Promise( async (resolve, reject) => {
  //   resolve(list)
  // })
}

module.exports = {
  insertBook,
  updateBook,
  getBook,
  getCategory,
  listBook,
  deleteBook
}