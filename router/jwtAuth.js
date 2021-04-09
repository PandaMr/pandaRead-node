const jwt = require('express-jwt')
const { PRIVATE_KEY } = require('../utils/constant')

const jwtAuth = jwt({
    // jwt认证私钥
    secret: PRIVATE_KEY,
    algorithms: ['HS256'],
    credentialsRequired: true, // 设置为false不校验参数，游客也可以访问
}).unless({
    // jwt认证白名单
    path: [
        '/',
        '/video/upload',
        '/video/list',
        '/video/addComment',
        '/video/getComment',
        '/video/create',
        '/vue-element-admin/user/login'
    ]
})

module.exports = jwtAuth