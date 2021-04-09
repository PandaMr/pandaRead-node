const express = require("express");
const multer = require("multer");
const boom = require('boom')
const { UPLOAD_PATH } = require("../utils/constant");
const Result = require("../models/result");
const Book = require("../models/Book");
const { decode } = require('../utils/index')
const bookService = require('../services/book');
const { response } = require("express");
const { badImplementation } = require("boom");
const { result } = require("lodash");


const router = express.Router();

// 上传图书
router.post(
  "/upload",
  // multer({ dest: `${UPLOAD_PATH}/book` }).single('file'),
  multer({ dest: `${UPLOAD_PATH}/book` }).single("file"),
  (req, res, next) => {
    if (!req.file || req.file.length === 0) {
      new Result("上传电子书失败").fail(res);
    } else {
      const book = new Book(req.file);
      book.parse()
        .then((book) => {
					// console.log('book info' ,book);
          new Result(book, "上传电子书成功").success(res);
        })
        .catch((err) => {
					next(boom.badImplementation(err))
				})
    }
  }
)

// 创建图书
router.post('/create', (req, res, next) => {
	const decoded = decode(req)
	if(decoded && decoded.username) {
		req.body.username =  decoded.username
	}
	// 提交的图书信息
  const book = new Book(null, req.body)
  // const book = {}

  // 将电子书插入数据库
  bookService.insertBook(book).then(()=>{
    new Result( "添加电子书成功").success(res);
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

// 编辑图书
router.post('/update', (req, res, next) => {
  // 从token中拿到 用户名
	const decoded = decode(req)
	if(decoded && decoded.username) {
		req.body.username =  decoded.username
	}
	// 提交的图书信息
  const book = new Book(null, req.body)
  // 将电子书插入数据库
  bookService.updateBook(book).then(()=>{
    new Result( "编辑电子书成功").success(res);
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

// 获取图书信息
router.get('/get', (req, res, next) => {
  // 获取传来的fileName参数，调用bookService中的getBook() 方法来获取图书信息
  const { fileName } = req.query
  if(fileName) {
    bookService.getBook(fileName).then(book => {
      new Result(book, '获取图书信息成功').success(res)
    }).catch(err => {
      next(boom.badImplementation(err))
    })
  } else {
    next(boom.badRequest(new Error('fileName参数不能为空')))
  }
}) 

// 删除图书
router.get('/delete', (req, res, next) => {
  const { fileName } = req.query
  if(fileName) {
    bookService.deleteBook(fileName).then(book => {
      new Result('删除图书信息成功').success(res)
    }).catch(err => {
      next(boom.badImplementation(err))
    })
  } else {
    next(boom.badRequest(new Error('fileName参数不能为空')))
  }
})

// 获取图书分类列表
router.get('/category', (req, res, next) => {
  // 获取数据库中的图书列表逻辑在 servive中的book.js
  bookService.getCategory().then(category => {
    new Result(category, '获取分类成功').success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  }) 
})

// 获取图书列表
router.get('/list', (req, res, next) => {
  bookService.listBook(req.query).then(({ list, count, page, pageSize }) => {
    new Result({ list, count, page: +page, pageSize: +pageSize }, '获取图书列表成功').success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

module.exports = router;
