const mysql = require('mysql')
const config = require('./config')
const { debug } = require('../utils/constant')
const { isObject } = require('../utils/index')
const Result = require('../models/result')
// 链接mysql 传入连接mysql数据库的信息 
function connect(){
    return mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        multipleStatements: true  // 允许每条 mysql语句有多条查询
    })
}
// 查询mysql
function querySql(sql){
    // 连接数据库
    const conn = connect()
    // 打印查询日志
    debug && console.log(sql);
    // 查询数据库数据，使用异步操作 Promise
    return new Promise((resolve, reject) => {
        try {
            conn.query(sql, (err, results) => {
                if(err){
                    // 查询失败日志
                    debug && console.log('查询失败，原因：'+JSON.stringify(err));
                    reject(err)
                }else{
                    // 查询成功日志
                    debug && console.log('查询成功，返回数据：'+ JSON.stringify(results));
                    resolve(results)
                }
            })
        } catch (e) {
            reject(e)
        } finally {
            // 释放mysql连接，finally最终是否报错都会到这里
            conn.end()
        }
    })
}
// 查询一条信息
function queryOne(sql) {
    return new Promise((resolve, reject) => {
        querySql(sql).then(results => {
            if(results && results.length > 0){
                resolve(results[0])
            }else{
                resolve(null)
            }
        }).catch(error => {
            reject(error)
        })
    })
}

// 插入数据库图书数据
function insert(model, tableName) {
    return new Promise((resolve, reject) => {
        // 判断model 是否为一个对象
        if(!isObject(model)) {
            reject(new Error('图书插入数据库失败，插入的图书非对象'))
        } else {
            // 将model图书对象中的keys和values 存入对应的数组
            const keys = []
            const values = []
            // 键和值 循环存入对用的数组
            Object.keys(model).forEach(key => {
                // 判断当前的key值是否是对象本身的key，可能是原型链上的属性
                if(model.hasOwnProperty(key)) {
                    keys.push(`\`${key}\``)
                    values.push(`'${model[key]}'`)
                }
            })
            // 判断 keys和values数组的长度，都大于0，才执行插入语句
            if(keys.length > 0 && values.length > 0) {
                // 插入的sql语句
                let sql = `insert into \`${tableName}\` (`
                // 把keys和values拼接为字符串
                const keysString = keys.join(',')
                const valuesString = values.join(',')
                sql = `${sql}${keysString} ) values (${valuesString})`
                debug && console.log(sql);
                const conn = connect()
                try {
                    conn.query(sql, (err, results) => {
                        if(err){
                            
                            reject(new Error(err))
                        } else {
                            resolve(results)
                        }
                    })
                } catch (error) {
                    reject(error)
                } finally {
                    conn.end()
                }
            } else {
                reject(new Error('插入对象不合法，对象没有任何属性 '))
            }
        }
    })
}

// 更新图书信息
function update(model, tableName, where){
  return new Promise((resolve, reject) => {
    if(isObject(model)){
      // insert into a,b values(v1,v2)
      // update tableName set a=v1, b=v2
      // 存放更新的字段
      let entry = []
      // 遍历
      Object.keys(model).forEach(key => {
        if(model.hasOwnProperty(key)) {
          entry.push(`\`${key}\`='${model[key]}'`)
        }
      })
      if(entry.length > 0) {
        let entryString = entry.join(',')
        let sql = `update \`${tableName}\` set`
        sql = `${sql} ${entryString} ${where}`
        // 链接数据库
        let conn = connect()
        try {
          conn.query(sql, (err, result) => {
            if(err) {
              reject(err)
            } else {
              resolve(result)
            }
          })
        } catch (error) {
          reject(error)
        } finally {
          conn.end()
        }

      }
    } else {
      reject(new Error('图书插入数据库失败，插入的图书非对象'))
    }
  })
}

// 查询条件
function and(where, key, value){
    if(where === 'where'){
        return `${where} \`${key}\`='${value}'`
    } else {
        return `${where} and \`${key}\`='${value}'`
    }
}

// 模糊查询
function andLike(where, key, value) {
    if(where === 'where') {
        return `${where} \`${key}\` like '%${value}%'`
    } else {
        return `${where} and \`${key}\` like '%${value}%'`
    }
}

module.exports = {
    querySql,
    queryOne,
    insert,
    update,
    and,
    andLike
}