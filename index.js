var feather = module.exports = require('feather2');
var old = feather.cli.run;

feather.cli.run = function(argv, env){
    var first = argv[2], action = argv._[0];

    if(action == 'server' && !argv.root && !argv.r){
        var www = feather.project.getTempPath('www'), script = www + '/preview/index.html';
        !feather.util.exists(script) && feather.util.copy(__dirname + '/vendor/index.html', script);
        argv.root = www + '/preview';
    }

    old(argv, env);
};

feather.config.merge({
    project: {
        name: '_default',
        modulename: ''
    },

    modules: {
        hook: require('feather2-lang-hook-components')
    },

    server: {
        clean: false
    },

    postpackager: [require('feather2-lang-postpackager-runtime')]
});

feather.config.get('packager').unshift(require('feather2-lang-packager-map'));

feather.on('conf:loaded', function(){
    var modulename = feather.config.get('project.modulename');

    if(!modulename){
        feather.config.set('project.modulename', modulename = 'common');
    }

    feather.config.set('namespace', modulename);

    feather.match('map.json', {
        release: 'view/_map_/${namespace}.json',
        useHash: false
    }, 1000000);

    feather.match('/conf/(**)', {
        release: feather.isPreviewMode ? '/conf/${namespace}/$1' : false
    }, 1000000);


    feather.match('/conf/engine.json', {
        release: 'view/engine.json',
        useHash: false
    }, 1000000);

    feather.match('plugins/(**)', {
        release: 'view/_plugins_/$1',
        useCompile: false,
        useHash: false,
        isHtmlLike: false,
        useMap: false,
        url: false
    }, 10000000);

    if(modulename != 'common'){
        feather.match('static/{pagelet,feather}.js', {
            release: false
        }, 1000000);

        feather.match('/conf/engine.json', {
            release: false
        }, 1000001);
    }

    //feather2.0规定data目录 同feather1.x中的test目录，1.x中test目录创建的初衷也是为了测试数据
    feather.match('/data/**', {
        useHash: false,
        useCompile: false,
        release: feather.isPreviewMode ? 'data/${namespace}/$&' : false
    });

    var www = feather.project.getTempPath('www'), preview = www + '/preview';

    feather.config.set('deploy.preview', [
        {
            from: '/',
            to: www + '/project/' + feather.config.get('project.name'),
            subOnly: true
        },
        {
            from: '/static',
            to: preview
        }
    ]);
});


feather.on('conf:loaded', function(){
    var modulename = feather.config.get('project.modulename'), name = feather.config.get('project.name');  

     //查找是否有common模块       
    if(modulename == 'common'){     
        feather.releaseInfo = {       
            config: {},     
            components: {},       
            map: {},      
            modules: {}       
        };     
    }else{        
        var root = feather.project.getCachePath() + '/info/' + name + '.json';    
        var info;

        do{
            if(feather.util.exists(root)){
                info = feather.util.read(root);

                try{
                    info = feather.releaseInfo = JSON.parse(info);
                    break;
                }catch(e){}
            }

            feather.log.error('Run common module first please!');   
        }while(0);

        var config = feather.config.get(), commonConfig = info.config;

        feather.config.set('template', commonConfig.template);            

        if(feather.util.isEmpty(config.project.domain)){      
            feather.config.set('project.domain', commonConfig.project.domain);        
        }     

        if(commonConfig.statics != config.statics){       
            feather.log.warn('common module\'s statics[' + commonConfig.statics + '] is different from current module\'s statics[' + config.statics + ']!');      
        }     

        //判断如果找不到当前模块，说明已过期
        if(!info.modules[modulename]){
            feather._argv.clean = true;       
            delete feather._argv.c;       
        }  
    }    

    if(feather._argv.clean || feather._argv.c){
        var www = feather.project.getTempPath('www'), preview = www + '/preview/', project = www + '/project/' + name + '/';

        try{
            feather.util.del(project + 'conf/' + modulename);
            feather.util.del(project + 'data/' + modulename);
            feather.util.del(project + 'view/_map_/' + modulename + '.json');
            feather.util.del(project + 'view/_plugins_');
            feather.util.del(project + 'view/' + modulename);
        }catch(e){};
    }
});

var lookup = feather.project.lookup;

feather.project.lookup = function(path, file){
    if(/:\/?[^\/]/.test(path)){
        var quote = /['"]/.test(path) ? path[0] : '';

        path = feather.util.stringQuote(path).rest;

        var temp = path.split(':');

        if(temp[0] == '' || temp[0] == feather.config.get('namespace')){
            path = temp[1];
        }

        path = quote + path + quote;
    }

    return lookup(path, file);
};