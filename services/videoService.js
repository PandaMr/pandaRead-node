const db = require("../db/index");
const _ = require("lodash");

// 资源是否存在
function exists(data) {
  // 从图书中获取标题、作者、出版社，如果三者都相同 则图书已经存在数据库中
  const { filename } = data;
  const sql = `select * from video where filename='${filename}'`;
  return db.queryOne(sql);
}

// 创建视频
async function insertVideo(video) {
  return new Promise(async (resolve, reject) => {
    const result = await exists(video);
    if (result) {
      reject(new Error("资源已存在"));
    } else {
      await db.insert(video, "video");
      resolve();
    }
  });
}

// 获取视频列表
async function videoList(query) {
  console.log(query);
  const { title, page = 1, pageSize = 20, sort } = query;
  let sql = "select * from video";
  let where = "where";
  // 设置查询的偏移量 ，以便分页
  let offset = (page - 1) * pageSize;
  // 分类条件，如果传入则按照分类查询，具体逻辑在db中的and方法
  // 查询标题和作者进行模糊查询
  title && (where = db.andLike(where, "filename", title));
  // 查询条件 分类，标题，作者有可能会不传入，要做判断后在进行查询
  if (where !== "where") {
    sql = `${sql} ${where}`;
  }
  // 排序功能，判断修改sql, 根据传来的升降序 来确定sql
  if (sort) {
    let symbol = sort[0];
    let column = sort.slice(1, sort.length);
    let order = symbol === "+" ? "asc" : "desc";
    sql = `${sql} order by \`${column}\` ${order}`;
  }

  // 分页查询sql
  let countSql = "select count(*) as count from video";
  // 判断有没有查询条件
  if (where !== "where") {
    countSql = `${countSql} ${where}`;
  }
  // 向数据库查找数据，返回图书列表总数
  let count = await db.querySql(countSql);
  console.log(count);
  // sql查询语句 设置查询的数量
  sql = `${sql} limit ${pageSize} offset ${offset}`;
  // 向数据库查询数据，返回图书列表
  let list = await db.querySql(sql);

  // async await 中返回的数据会自动转为Promise
  return { list, count: count[0].count, page, pageSize };
  // return new Promise( async (resolve, reject) => {
  //   resolve(list)
  // })
}

// 删除视频
function deleteVideo(filename) {
  return new Promise(async (resolve, reject) => {
    // 删除电子书需要先获取， 判读是不是内置电子书
    let sql = `delete from video where filename = '${filename}'`;
    db.querySql(sql).then((res) => {
      resolve(res);
    });
  });
}



// 添加评论
async function addComment(params) {
  return new Promise( async (resolve, reject) => {
     await db.insert(params, 'comment').then((res) => {
       resolve(res)
     })
  })
}

// 获取评论
async function getComment() {
  return new Promise(async (resolve, reject) => {
    let sql = "select * from comment";
    let result = await db.querySql(sql)
    let commentList = []
    result.forEach(item => {
      commentList.push({
        id: item.id,
        content: item.content,
        filename: item.filename
      })
    });
    resolve(commentList)
    
  })
}

// 删除评论
function deleteComment(id) {
  return new Promise(async (resolve, reject) => {
    // 删除电子书需要先获取， 判读是不是内置电子书
    let sql = `delete from comment where id = '${id}'`;
    db.querySql(sql).then((res) => {
      resolve(res);
    });
  });
}

module.exports = {
  insertVideo,
  videoList,
  deleteVideo,
  addComment,
  getComment,
  deleteComment
};
