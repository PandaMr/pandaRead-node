const { env } = require('./env')
// 上传的地址
const UPLOAD_PATH = env ? '/Users/panda/project/web/imooc/pandaRead/nginxServer/upload' : '/usr/local/Cellar/nginx/1.19.3/html/admin-upload-ebook'
// 上传的服务器地址
const OLD_UPLOAD_URL = env ? 'http://localhost:8089/book/res/img' : 'http://localhost:8089/book/res/img'
// 上传的服务器地址
const UPLOAD_URL = env ? 'http://localhost:8089' : 'http://localhost:8089'
module.exports = {
    CODE_ERROR: -1, // 失败状态码
    CODE_SUCCESS: 0, // 成功状态吗
    CODE_TOKEN: -2,  // TOKEN 失效状态码
    debug: true, // 打印日志
    PWD_SALT: 'admin_imooc_node', // 盐值加密
    JWT_EXPIRED: 60*60*24,  // token过期时间
    PRIVATE_KEY: 'admin-pandaRead-node',  // token私钥
    UPLOAD_PATH,  // 图书上传地址
    UPLOAD_URL,  // 图书服务器url路径
    OLD_UPLOAD_URL,
    MIME_TYPE_EPUB: 'application/epub+zip', // 图书类型名


}