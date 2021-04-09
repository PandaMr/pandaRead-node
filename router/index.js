const express = require('express')
const boom = require('boom')
const userRouter = require('./user.js')
const bookRouter = require('./book.js')
const videoRouter = require('./video.js')
const jwtAuth = require('./jwtAuth')
const Result = require('../models/result')

// 注册路由
const router = express.Router()

router.use(jwtAuth)

router.get('/', (req, res) => {
    res.send('panda read')
})

// 路由解藕 /user的路由 通过userRouter处理
router.use('/vue-element-admin/user', userRouter)

router.use('/book', bookRouter)

// 新增接口
router.use('/video', videoRouter)

/**
 * 集中处理404请求的 中间件
 * 注意：该中间件必须放在正常处理流程之后,否则，会拦截正常请求
 * 错误信息会继续传递给下一个中间件，需要自定义 异常处理来处理错误
 */
router.use((req, res, next) => {
    next(boom.notFound('接口不存在'))
})

// 自定义异常处理
router.use((err, req, res, next) => {
    console.log(err);
   
    const { status = 401, message } = err
     // 判断是否token有效
    if(err.name === "UnauthorizedError"){
        new Result(null, 'token验证失败', {
            error: status,
            errMsg: message
        }).jwtAuth(res.status(status))
    }else{
        const msg = (err && err.message) || '系统错误'
        const statusCode = (err.output && err.output.statusCode) || 500
        const errorMsg = (err.output && err.output.payload && err.output.payload.error) || err.message

        // 抛出错误
        new Result(null, msg, {
            error: statusCode,
            errorMsg
        }).fail(res.status(statusCode))
    }
    
})
 

// 导出路由，在app.js中使用 
module.exports = router 