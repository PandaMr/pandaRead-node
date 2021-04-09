const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { PRIVATE_KEY } = require('./constant')

// MD5 加密
function md5(s) {
    return crypto.createHash('md5').update(String(s)).digest('hex');
}

// jwt.verify(token, private_key) 进行token解析 ，获取用户名。
// 参数: token ， 私钥
function decode(req){
    let token  = req.get('Authorization')
    
    if(token.indexOf('Bearer') === 0){
        token = token.replace('Bearer ', '')
    }
    return jwt.verify(token, PRIVATE_KEY)
}

// 判断是否为对象  
function isObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]'
}

module.exports = {
    md5,
    decode,
    isObject
}