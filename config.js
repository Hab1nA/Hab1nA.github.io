/** 更多样式 http://developer.baidu.com/map/custom/list.htm */
var MAP_STYLE = "googlelite";

var DATA = {

	"北京" : {
		"北京航空航天大学" : ["谢铠舟"],
		"北京航空航天大学(沙河校区)" : ["李雨桐"],
		"北京大学" : ["郑睿恒","张楚媛"], //未校验
		"北京大学(医学部校区)" : ["朱映羲"],
		"中国科学院大学" : ["邓思豪"],
		"中国人民公安大学(团河校区)" : ["陈宪"],
	},

	"上海" : {
		"上海交通大学(闵行校区)" : ["王渊弼","周钰琦","江恺兮"], 
		"同济大学" : ["刘晓冬","马源胜","方舒雅"], 
	},

	"南京" : {
		"南京大学(鼓楼校区)": ["何衍泽"],
		"南京大学(仙林校区)": ["梁一铭"],
	},

	"深圳" : {
		"香港中文大学(深圳）" : ["罗雪菲"],
		"南方科技大学" : ["王彦儒","陈彦兴"],
		"中山大学(深圳校区)" : ["宿培娴"],
	},

	"广州" : {
		"华南理工大学(五山校区)" : ["徐浩然"], 
		"中山大学(广州校区南校园)" : ["彭昊楠"], //未校验
	},

	"珠海": {
		"中山大学(珠海校区)" : ["黄腾中"], 
	},

	"成都": {
		"四川大学(华西校区)" : ["钟思雨"], //未校验
		"电子科技大学(清水河校区)" : ["潘思颖"],
		"电子科技大学(沙河校区)" : ["林晟周"],
	},

	"武汉": {
		"华中科技大学": ["李语心","宋孟阳"], //未校验
		"武汉大学": ["曹子宸"], 
		"中国地质大学": ["李宛秋"], //未校验
	},

	"西安": {
		"西北工业大学(长安校区)": ["胡怡凡"], 
		"西安交通大学": ["章雪雁"], //未校验
		"西安电子科技大学": ["张雨阳"], //未校验
	},

	"威海": {
		"哈尔滨工业大学(威海校区)": ["青哮添"],
	},

	"济南": {
		"山东大学": ["刘恩荣"], //未校验
	},

	"沈阳": {
		"东北大学": ["陈里函"], 
	},

	"宁波": {
		"宁波诺丁汉大学": ["温博凯"],
	},

	"合肥": {
		"中国科学技术大学": ["孙若尧"], 
	},

	"重庆": {
		"重庆大学": ["邹亦峰"], //未校验
	},

	"伦敦": {
		"帝国理工学院": ["朱梅可芸"], 
	},

	//"新加坡": {
	//	"": ["王培任"], //未校验
	//},

};

var SPEC_POS = {
	"中国科学院大学" : [116.257207,39.915389],
	"帝国理工学院" : [-0.179124,51.498889]
};

var MAP_TITLE = "💖天府七中首届一班的蹭饭图💖";

var ABOUT = {
	"原作者＆鸣谢" : ["Yuehao"],
	"作者" : ["谢铠舟"],
	"信息收集" : ["邓思豪","谢铠舟"],
	"意见反馈" : ["QQ:2321403454"],
	"框架" : ["<a href='https://github.com/yuehaowang/irmap' target='_blank'>irmap</a>", "Bootstrap", "百度地图"],
	"备注": ["地图性能比较差，请耐心等待加载","(免费的能用就不错了要啥自行车😅)","少部分同学的大学所在校区尚不明确，后续将会更正", "歌是我随便选的",],
	"版本" : ["23.7.24 试运行"],
};
