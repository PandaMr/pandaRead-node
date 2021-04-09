const { CODE_ERROR, CODE_SUCCESS , CODE_TOKEN } = require('../utils/constant')

// 请求响应结果封装，便于调用接口获取返回值的状态和数据 
class Result {
    // 构造函数
    constructor(data, msg='操作成功', options){
        this.data = null
        if(arguments.length === 0){
            this.msg = '操作成功'
        }else if(arguments.length === 1){
            this.msg = data
        }else{
            this.data = data
            this.msg = msg
            if(options){
                this.options = options
            }
        }
    }

    // 返回的数据结果
    createResult(){
        if(!this.code){
            this.code = CODE_SUCCESS
        }
        let base = {
            code: this.code,
            msg: this.msg,
            
        }
        if(this.data){
            base.data = this.data
        }
        // 目前返回的参数 {base: code, msg,data, ...(options)}
        if(this.options){
            // 如果options对象 里有值
            // 使用浅拷贝 重新赋值给base对象
            base = {...base, ...this.options}
        }
        // 打印出响应结果的日志
        console.log(base);
        return base
    }

    // 将响应的结果对象转化成 json 对象
    json(res){
        res.json(this.createResult())
    }

    // 请求成功 返回的数据
    success(res){
        this.code = CODE_SUCCESS
        this.json(res)
    }

    // 请求失败 返回的数据
    fail(res){
        this.code = CODE_ERROR
        this.json(res)
    }

    jwtAuth(res){
        this.code = CODE_TOKEN
        this.json(res)
    }
}

module.exports = Result
