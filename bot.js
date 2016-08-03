var irc = require('irc');
var fs = require('fs');
var cp = require('child_process');
var mktemp = require('mktemp');
var config = require("./config");
process.addListener("uncaughtException", function(err) {
  console.log(err);
});

var options = config.ircClientOptions;

var window  = {};
var client = new irc.Client(config.network, config.nick, options);

function sendOutput(to, from, stdout, stderr) {
  if(to == client.nick) { //pm
    return client.say(from, "stdout: " + stdout.toString() + "\nstderr: " + stderr);
  }
  var channel = to;
  stdout = stdout.toString().trim();
  stderr = stderr.toString().trim();
  if(stdout.length === 0 && stderr.length === 0) {
    return client.say(from, "No output, but it ran I guess");
  }
  if(stdout.length === 0) {
    var stderrLine = 'stderr: ' + stderr.split("\n").join(" | ");
    if(stderrLine.length < 460) return client.say(channel, stderrLine);
    else {
      client.say(channel, stderrLine.substring(456) + " ...");
      return client.say(from, 'stderr: ' + stderr);
    }
  }
  //stdout has length, ignore stderr
  var oneLine = stdout.split("\n").join(" | ");
  if(oneLine.length < 460) client.say(channel, oneLine);
  else {
    client.say(channel, oneLine.substring(456) + " ...");
    client.say(from, 'stdout: ' + stdout);
    if(stderr) client.say(from, 'stderr: ' + stderr);
    return;
  }
}

client.addListener('message', function(from, to, text) {
  var child,out,file;
  if(config.ignore.indexOf(from) >= 0) {
    return;
  }

  if(/^\!(js)?eval /.test(text)) {
    text = text.substring(text.indexOf(' ')+1);

    try {
      out = "";
      file = mktemp.createFileSync("/tmp/script-XXXX.js");
      fs.writeFileSync(file, text);

      child = cp.execFile("node", [file], function(err, stdout, stderr) {
        sendOutput(to, from, stdout, stderr);
      });

      setTimeout(function(){ child.kill(); }, 10000);
    } catch(ex) { console.log(ex); }
  } else if(/^\!exec /.test(text)) {
    text = text.substring(6);
    try {
      child = cp.exec(text, function(err, stdout, stderr) {
        sendOutput(to, from, stdout, stderr);
      });

      setTimeout(function(){ child.kill(); }, 10000);
    } catch(ex) { console.log(ex); }
  } else if(/^\!rbeval /.test(text)) {
    text = text.substring(8);
    try {
      out = "";
      file = mktemp.createFileSync("/tmp/script-XXXX.rb");
      fs.writeFileSync(file, text);

      child = cp.execFile("ruby", ['-Ku',file], function(err, stdout, stderr) {
        sendOutput(to, from, stdout, stderr);
      });

      setTimeout(function(){ child.kill(); }, 10000);
    } catch(ex) { console.log(ex); }
  } else if(/^\!(date|ddate|ls|cat|ruby|python|bash)/.test(text)) {
    text = text.substring(1);
    try {
      child = cp.exec(text, function(err, stdout, stderr) {
        if(stdout)
          sendOutput(to, from, stdout, stderr);
      });
      setTimeout(function(){ child.kill(); }, 10000);
    } catch(ex) { console.log(ex); }
  }
});
