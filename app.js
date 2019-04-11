
var express = require('express');
var app = express();
var path = require('path')
var session = require('express-session');
var user_db = require("./models/userDB.js");
var prod_db = require('./models/productDB.js')
var bodyParser = require('body-parser');
var urlencodedParser = require('urlencoded-parser');
const fileUpload = require('express-fileupload');
//var multer = require('multer');
//var upload = multer({dest:'resources/img'});
const client = require('twilio')('ACe8e330fe9b0f776824621ce4678c3e95','35f25bd051e7ba2835b6c2693432d15e');
var count = 0;
var busboy = require('connect-busboy');
var fs = require('fs');

app.use(busboy());
app.use(bodyParser.json());
urlencodedParser = bodyParser.urlencoded({extended: false});
app.use(express.static(path.join(__dirname, '/resources')));

app.set('views','views');
app.set('view engine', 'ejs');

app.use(session({secret: "marketplace",resave:true,saveUninitialized:true}));

app.use(fileUpload());

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://localhost/marketplace',{ useNewUrlParser: true });


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function() {
   console.log("We are connected!");
});

// app.get('/', async function(req, res){
//   req.session.count = count;
//   count++;
//   var users = await user_db.getAllUsers();
//   var item = await prod_db.getAllItems();
//
//   console.log("You accessed the page"+req.session.count+' times.');
//   console.log(users);
//   // res.sendFile(__dirname + '/index.html');
//   res.render('sign-in',{product:item});
// });

app.get('/', async function(req, res, next){
  // var user = req.session.username;
  // var pass = req.session.password;
  // var userObj = await user_db.getUser(user,pass);
  // req.session.user = userObj;
  console.log("IN /");
  res.render('sign-in');
});

app.get('/sign-in', function(req, res, next){
  console.log("IN GET");
  res.render('sign-in');
});
app.post('/sign-in',urlencodedParser,async function(req,res,next){
   console.log("IN POST" +req.session.user.first_name);
   var first = req.body.fname;
   var last = req.body.lname;
   var uname = req.body.uname;
   var email = req.body.email;
  var password = req.body.password;
  await user_db.addUser(uname, first, last, email, password);

  res.render('sign-in');

});

app.get('/sign-up', function(req, res, next){
    res.render('sign-up');
});

app.get('/shop', async function(req, res, next){
  var item = await prod_db.getAllItems();

  if(req.query.product_category){
  var item_by_cat = await prod_db.getMatchingCategoryItem(req.query.product_category);
  console.log(item_by_cat);
  console.log(req.session.user.first_name);
  res.render('shop', {products:item_by_cat});
}else if (req.query.location) {
  var item_by_loc = await prod_db.getMatchingLocItem(req.query.location);
  console.log(req.session.user.first_name);
  res.render('shop', {products:item_by_loc});
}
  else{
    console.log("USERNAME"+req.session.user.username);
    res.render('shop', {products:item});
  }
});

app.post('/shop', urlencodedParser,async function(req, res, next){
  var user = req.body.username;
  var pass = req.body.password;
  var products = [];
  var userObj = await user_db.getUser(user,pass);
  req.session.user = userObj;
  //console.log(req.session.user);
  // if(typeof req.query.sellitem !=="undefined"){
  // var form_name = req.body.prod_name;
  // var form_price = req.body.price;
  // var form_desc = req.body.productdesc;
  // var form_email = req.body.Email;
  // console.log(form_name);
  // }


  var item = await prod_db.getAllItems();
  item.forEach(function(prod){
    if(prod.Email === req.session.user.email){
      products.push(prod);
    }
  });
  req.session.user.user_items = products;
  // console.log("SESSION"+req.session.user.products);
  if(req.query.product_category){
  var item_by_cat = await prod_db.getMatchingCategoryItem(req.query.product_category);
  //console.log(item_by_cat);
  res.render('shop', {products:item_by_cat});
  }else{
    res.render('shop', {products:item});
}
});

app.get('/product-details', async function(req, res, next){
  var data = req.query.product_code;
  // console.log(data);
   var item = await prod_db.getProduct(data);
   console.log("in product-details");
   // client.sendMessage({
   //   to: '+17049208440',
   //   from: '+15073154421',
   //   body:'Hello, one user has emailed you regarding your ad posted on 49er Marketplace.'
   // }, function(err, data){
   //   if(err){
   //     console.log(err);
   //   }
   //   console.log(data);
   //
   // });
   //var delete = await prod_db.removeItem(data);
   // console.log(item);
   // console.log(req.session.user.email);
    res.render('product-details', {products:item});
});

app.get('/sell', async function(req, res, next){
  var action = req.query.action;
  var code = req.query.product_code;
  var items = [];
  //console.log(action);
  //console.log(code);
  await prod_db.deleteItem(code);
  req.session.user.user_items = await prod_db.getProductEmail(req.session.user.email);

  // client.sendMessage({
  //   to: '+17049208440',
  //   from: '+15073154421',
  //   body:'Hello, one user has emailed you regarding your ad posted on 49er Marketplace.'
  // }, function(err, data){
  //   if(err){
  //     console.log(err);
  //   }
  //   else {
  //   console.log(data);
  //   }
  // })
  //console.log(req.session.user.user_items);
    res.render('sell',{products:req.session.user.user_items});
});

app.post('/sell', urlencodedParser, async function(req,res,next){
  var form_name = req.body.firstName;
  var form_price = req.body.price;
  var form_desc = req.body.productdesc;
  var form_email = req.body.Email;
  var loc = req.body.location;
  var cat = req.body.item_cat;
  var last_prod = await prod_db.getLastProduct();
  var last_code = parseInt(last_prod[0].prod_code);
  var form_code = last_code+1;
  var startup_image = req.files.main_image;
  var main_image_path ='/img/products/' + form_code + '_main.jpg';

  console.log(last_prod[0]);
  console.log("last code: " +last_code);
  console.log("current code " +form_code);

  startup_image.mv(__dirname + '/resources/img/products/' + form_code + '_main.jpg' , function(err) {
    if(err){
      console.log(err);
    }else{
   console.log("uploaded");
}
  });


  await prod_db.addItem(form_name, form_code, form_email, loc, cat, form_price, form_desc,main_image_path);
  req.session.user.user_items = await prod_db.getProductEmail(req.session.user.email);
  console.log("aahiya chu");
  // console.log(req.file.name);
  // res.send(req.files);
  res.redirect('sell');
});

app.get('/SellNew', function(req, res, next){
  res.render('SellNew');
});



// app.get('/trial', async function(req,res,next){
//   var item = await prod_db.getAllItems();
//   console.log(item);
//   res.render('trial',{products:item});
// });
app.listen(3000);
