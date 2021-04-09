const express = require('express')
const router = require('./router')
const bodyParser = require('body-parser')
const cors = require('cors')
// 创建express应用
const app = express();
// 使用body-parser请求体解析
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// 路由抽离出当作一个中间件使用 
app.use('/', router)

// 异常处理
// const errorHandle = function(err, req, res, next){
//     console.log('errorHandle');
//     res.status(500);
//     res.json('not find')
// }
// app.use(errorHandle)
// 中间件 所有中间件都是一个函数
function middle(req, res, next){
    console.log('middle');
    next();
}
app.use(middle)
// 监听 / get请求
// app.get('/', function(req, res) {
//     throw new Error('something error')
// })

// 监听服务端口号
const server = app.listen(5000, ()=>{
    const {address, port} = server.address()
    console.log('express app start: http://localhost:'+port);
})


