const { querySql, queryOne } = require('../db/index')

// 数据库查询逻辑 ， 和 router中的业务逻辑分开

//登录操作， 查询数据库中的用户名和密码是否一致
function login(username, password){
    const sql = `select * from admin_user where username = '${username}' and password = '${password}'`
    // 查询出来的结果直接返回前端处理
    return querySql(sql)
}

function findUser(username){
    const sql = `select id, username, nickname, role, avatar  from admin_user where username = '${username}'`
    return queryOne(sql)
}

// querySql('select * from admin_user').then(result => {
//     // 查询数据的时候 输出的有成功和错误日志
// }).catch(err => {
    
// })
module.exports = {
    login,
    findUser
}