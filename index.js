var fs     = require('fs')
var path   = require('path')
var marked = require('marked')
var hb     = require('handlebars')
var t      = true
var i      = 0

module.exports = submarine

function submarine(options, callback) {
  options.header = options.header || "Submarine"
  options.footer = options.footer || ""

  var input = path.resolve(process.cwd(), options.input_dir)
  var invalidInput = !fs.existsSync(input)

  if(invalidInput) {
    callback('\033[91mThe input directory `./' + options.input_dir + '` does not exist.\033[0m')
  } else if(!options.output_dir) {
    callback('\033[91mPlease provide an output directory.\033[0m')
  } else {
    boardSubmarine(options)
  }

  function boardSubmarine(options) {
    createFolderMaybe(options.output_dir, function() {
      fs.readdir(path.resolve(process.cwd(), options.input_dir), function(err, files) {
        if (t && err) { t = false; return callback(err) }
        files = files.filter(function(n) { return n.match(/.+\..+$/) }).sort()
        makeFiles(files, options, callback)
      })
    })
  }

  function createFolderMaybe(output_dir, proceed) {
    // Create output_dir if doesn't exist
    if(!fs.existsSync(path.resolve(process.cwd(), output_dir))) {
      fs.mkdir(path.resolve(process.cwd(), output_dir), function(err) {
        if (t && err) { t = false; return callback(err) }
        proceed()
      })
    } else {
      proceed()
    }
  }

  function getTemplate(proceed) {
    if(options.template) {
      var template_path = path.resolve(process.cwd(), options.template)
    } else {
      var template_path = path.resolve(__dirname, 'template/index.html')
    }
    hb.registerPartial('header', (options.header || "Submarine"))
    hb.registerPartial('footer', (options.footer || ""))

    fs.readFile(template_path, function(err, data) {
      if (t && err) { t = false; return callback(err) }
      var template = hb.compile(data.toString())
      proceed(template)
    })
  }

  function makeFiles(files) {
    writeIndex(files, function(err) {
      if (t && err) { t = false; return callback(err) }

      // Write markdowns into HTML
      files.forEach(function(name) {
        fs.readFile(path.resolve(process.cwd(), options.input_dir, name), function(err, file) {
          if (t && err) { t = false; return callback(err) }
          var index = files.indexOf(name)
          var pages = { prev: files[index-1], next: files[index+1] }

          writeHTML(name, file.toString(), pages, function(i) {
            if (files.length === i) callback()
          })
        })
      })
    })
  }

  function writeHTML(file, filecontent, pages, finishing) {
    getTemplate(function(template) {
      var html = template({
        content: marked(filecontent),
        previous: getFilename(pages.prev),
        next: getFilename(pages.next)
      })

      fs.writeFile(path.resolve(process.cwd(), options.output_dir, getFilename(file) + '.html'), html, function (err) {
        if (t && err) { t = false; return callback(err) }
        i++
        finishing(i)
      })
    })
  }

  function writeIndex(files, proceed) {
    getTemplate(function(template) {
      var list = files.map(function(file) {
        var name = getFilename(file)
        return { href: name + '.html', name: name }
      })
      var html = template({index: list})
      fs.writeFile(path.resolve(process.cwd(), options.output_dir, 'index.html'), html, function (err) {
        proceed(err)
      })
    })
  }
}

function getFilename(name) {
  return name ? path.basename(name, path.extname(name)) : ""
}
