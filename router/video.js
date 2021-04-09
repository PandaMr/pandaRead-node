const express = require('express')
const multer = require("multer");
const boom = require('boom')
const { UPLOAD_PATH } = require("../utils/constant")
const Result = require('../models/result')
const videoService = require('../services/videoService')

const router = express.Router();

// 修改上传文件的路径和后缀名
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${UPLOAD_PATH}/video`);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
    /* cb(null, file.originalname + '.mp4'); */
  }
})

// 上传视频到服务器
router.post(
  "/upload",
  // multer({ dest: `${UPLOAD_PATH}/book` }).single('file'),
  // 上传的位置
  multer ({ storage: storage }).single("file"),
  (req, res, next) => {
    if (!req.file || req.file.length === 0) {
      console.log(res);
      new Result("上传视频失败").fail(res);
    } else {
      console.log(res);
      let videoData = req.file;
      // 添加后缀名
      // let suffix = videoData.mimetype === "video/mp4" ? ".mp4" : ""
      // videoData.filename = `${videoData.filename}${suffix}`
      // console.log("video:::", videoData);
      new Result(req.file ,"上传视频成功").success(res);
    }
  }
)

// 创建视频
router.post('/create', (req, res, next) => {
	// const decoded = decode(req)
	// if(decoded && decoded.username) {
	// 	req.body.username =  decoded.username
	// }

  // 将电子书插入数据库
  videoService.insertVideo(req.body).then(()=>{
    console.log(req.body);
    new Result("添加视频成功").success(res);
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

// 获取视频列表
router.get('/list', (req, res, next) => {
  videoService.videoList(req.query).then(({ list, count, page, pageSize }) => {
    new Result({ list, count, page: +page, pageSize: +pageSize }, '获取视频列表成功').success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

// 添加视频评论
router.post('/addComment', (req, res, next) => {
  videoService.addComment(req.body).then(() => {
    console.log(req.body);
    new Result("添加评论成功").success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

// 获取评论列表
router.get('/getComment', (req, res, next) => {
  videoService.getComment().then((comment) => {
    console.log(res);
    new Result(comment, "获取评论成功").success(res)
  }).catch(err => {
    next(boom.badImplementation(err))
  })
})

// 删除视频
router.get('/deleteComment', (req, res, next) => {
  const { id } = req.query
  if(id) {
    videoService.deleteComment(id).then(book => {
      new Result('删除评论成功').success(res)
    }).catch(err => {
      next(boom.badImplementation(err))
    })
  } else {
    next(boom.badRequest(new Error('id参数不能为空')))
  }
})

// 删除视频
router.get('/delete', (req, res, next) => {
  const { filename } = req.query
  if(filename) {
    videoService.deleteVideo(filename).then(book => {
      new Result('删除视频成功').success(res)
    }).catch(err => {
      next(boom.badImplementation(err))
    })
  } else {
    next(boom.badRequest(new Error('filename参数不能为空')))
  }
})

// 测试
// router.get('/list', (req, res, next) => {
//   new Result({name: 'bai'},'获取视频列表成功').success(res)
// }) 


module.exports = router