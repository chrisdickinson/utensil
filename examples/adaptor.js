var http = require('http')
  , SSE = require('sse')
  , clients = []
  , sse

Function.prototype.literal = function() {
  var str = ''+this
  return str.slice(str.indexOf('/*')+2, -3)
}

String.prototype.template = function(obj) {
  return this.replace(/\{\{(.*)\}\}/g, function(a, m) {

    return obj[m.trim()]
  })
}

var index = function() {/*
  <!doctype html>
  <html>
    <head>
      <script type="text/javascript" src="http://novus.github.com/nvd3/lib/d3.v2.js"></script>
      <script type="text/javascript" src="http://novus.github.com/nvd3/nv.d3.js"></script>
      <link href="http://novus.github.com/nvd3/css/bootstrap-responsive.css" rel="stylesheet">
      <link href="http://novus.github.com/nvd3/css/common.css" rel="stylesheet">
      <link href="http://novus.github.com/nvd3/src/d3.css" rel="stylesheet">

      <style>
        {{ style }}
      </style>
    </head>
    <body>
       <div class="container">
          <div id="memory" style="width:100%; height:300px;"><svg></svg></div>
          <div id="statuses"></div>
          <div id="responsetimes"></div>
          <ul id="messages"></ul>
       </div>
    </body>
    <script type="text/javascript">{{ script }}</script>
  </html>
*/}.literal()
   .template({
      style: style.literal()
    , script: '('+script+'())'
  })

function style() {/*
  .line {
      fill: none;
      stroke: #000;
      stroke-width: 1.5px;
  }

  .axis path, .axis line {
    fill: none;
    stroke: #000;
    shape-rendering: crispEdges;
  }

*/}

function script() {
  var es = new EventSource('/sse')
    , messages = []
    , pids = {}

  Function.prototype.debounce = function(ms) {
    var self = this
      , timeout

    return function() {
      if(timeout)
        clearTimeout(timeout)

      timeout = setTimeout(function() {
        self()
      }, ms)
    }
  }

  function PID(id) {
    this.pid = id
    this.metrics_memory = []
    this.metrics_request = []
  }

  var cons = PID
    , proto = PID.prototype

  cons.CUTOFF = 10 * 60 * 1000

  proto.add = function(kind, d) {
    if(!this[kind])
      return

    var now = Date.now()

    this[kind].push({x:now, y:d.data})

    if(this[kind][0].x <= now - cons.CUTOFF) {
      this[kind] = this[kind].filter(function(mem) {
        return now - mem.x < cons.CUTOFF
      })
    }
  }

  proto.lastHeapUsed = function() {
    if(!this.metrics_memory.length)
      return null

    return this.metrics_memory[this.metrics_memory.length-1].y.heapUsed
  }

  es.onmessage = function(ev) {
    var json = JSON.parse(ev.data)
      , tsub = json.message.type+'_'+json.message.subtype
      , isNew = !(json.pid in pids)
      , pid = pids[json.pid] = pids[json.pid] || new PID(json.pid)

    pid.add(tsub, json.message)

    if(isNew)
      memoryUsage(pid)
  }

  window.pids = pids
  var last = Date.now()
    , next

  var memoryUsage = function() { 
      var duration = 750,
          n = 40,
          now = new Date(Date.now() - duration),
          count = 0

      var margin = {top: 6, right: 0, bottom: 20, left: 40},
          width = 960 - margin.right,
          height = 120 - margin.top - margin.bottom;

      var x = d3.time.scale()
          .domain([now - (n - 2) * duration, now - duration])
          .range([0, width]);

      var y = d3.scale.linear()
          .range([height, 0]);

      var line = d3.svg.line()
          .interpolate("basis")
          .x(function(d, i) { return x(now - (n - 1 - i) * duration); })
          .y(function(d, i) { return y(d); });

      var svg = d3.select("#memory svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .style("margin-left", -margin.left + "px")
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      svg.append("defs").append("clipPath")
          .attr("id", "clip")
        .append("rect")
          .attr("width", width)
          .attr("height", height);

      var axis = svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(x.axis = d3.svg.axis().scale(x).orient("bottom"));

    return memoryUsage

    function memoryUsage(pid) {
      var data = d3.range(n).map(function() { return 0; })
        , path = svg.append("g")
            .attr("clip-path", "url(#clip)")
          .append("path")
            .data([data])
            .attr("class", "line")
            .attr("data-pid", pid.pid)

      var last = new Date()
      tick()

      function tick() {
        if(!pid.metrics_memory.length)
          return setTimeout(tick, 0)

        // update the domains
        now = new Date();

        x.domain([now - (n - 2) * duration, now - duration]);
        y.domain([0, d3.max(data)]);

        data.push(pid.lastHeapUsed())

        // redraw the line
        svg.select('[data-pid="'+pid.pid+'"]')
            .attr("d", line)
            .attr("transform", null);

        // slide the x-axis left
        axis.transition()
            .duration(duration)
            .ease("linear")
            .call(x.axis);

        // slide the line left
        path.transition()
            .duration(duration)
            .ease("linear")
            .attr("transform", "translate(" + x(now - (n - 1) * duration) + ")")
            .each("end", tick);

        // pop the old data point off the front
        data.shift()

      }
    }
  }()

  setInterval(function() {

    var next = Date.now()
      , out = []
    next = last
  }, 500)
}

var server = http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'})
  res.end(index)
})

server.listen(8080, '127.0.0.1', function() {
  sse = new SSE(server);
  sse.on('connection', function(client) {
    clients.push(client)
    client.on('close', function() {
      try { 
        clients.splice(clients.indexOf(client), 1)  
      } catch(e) { }
    })
  })
})

process.stdout.write('{')
module.exports = function(pid, msg) {
  process.stdout.write('"'+Date.now()+'":'+JSON.stringify(msg)+',') 
  clients.forEach(function(client) {
    try { 
      client.send(JSON.stringify({'pid': pid, 'message': msg}))
    } catch(e) { }
  })  
}
