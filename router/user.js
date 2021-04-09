const express = require('express')
const router = express.Router()
const Result = require('../models/result')
const { login,findUser } = require('../services/user')
const { md5, decode } = require('../utils/index')
const { PWD_SALT, PRIVATE_KEY, JWT_EXPIRED } = require('../utils/constant')
const { body, validationResult } = require('express-validator')
const boom = require('boom')
const jwt = require('jsonwebtoken')

// 登录后获取用户信息接口 
router.get('/info', (req, res) => {
    // 调用 解析token接口，解析出来后拿到用户名
    const decoded = decode(req)
    console.log(decoded);
    if(decoded && decoded.username){
        // 查找从token中解析的用户名 数据库中是否存在，并赋值角色信息
        findUser(decoded.username).then(user => {
            if(user){
                user.roles = [user.role]
                new Result(user,'获取用户信息成功').success(res);
            }else{
                new Result('获取用户信息失败').fail(res)
            }
        })
    }else{
        new Result('获取用户信息失败').fail(res)
    }
    
})

// 登录接口
router.post(
    '/login',
    // 使用express-validator中的body方法 验证用户名和密码是否正确
    [
        body('username').isString().withMessage('username类型不正确，必须为字符！'),
        body('password').isString().withMessage('password类型不正确，必须为字符！')
    ],
    (req, res, next) => {
        const error = validationResult(req)
        if(!error.isEmpty()) {
            // 解构出报错信息
            let [{ msg }] = error.errors
            next(boom.badRequest(msg))
        }else{
            console.log(req.body);
            // 获取请求参数中的用户名和密码
            let {username, password} = req.body
            // 密码设置盐加密
            password = md5(`${password}${PWD_SALT}`)
            // 登录操作
            login(username, password).then(user => {
                if(!user || user.length === 0){
                    new Result('登录失败').fail(res)
                }else{
                    // 生成token 返回前端 
                    const token = jwt.sign(
                        { username },
                        PRIVATE_KEY,
                        { expiresIn: JWT_EXPIRED}
                    )
                    new Result({ token }, '登录成功').success(res)
                }
            })
        }
        
    
    // res.json({
    //     code: 0,
    //     mgs: '登陆成功'
    // })
})

module.exports = router 