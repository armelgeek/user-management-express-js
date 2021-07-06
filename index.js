const path = require("path");
const fs = require("fs");
const cron = require('node-cron');
const translate = require("baidu-translate-api");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const playwright = require('playwright');
const dotenv = require("dotenv");
const fileUpload = require('express-fileupload');
const Datastoree = require('nedb-promises')
dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();
const usersRoutes = require("./routes/users");
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, DELETE"
  );
  next();
});
app.use(bodyParser.json());
app.use(cookieParser());
const publicDir = require('path').join(__dirname,'uploads'); 
app.use(express.static(publicDir)); 
app.use(fileUpload());
const dbb = {};
dbb.products = Datastoree.create('data/products.db');
dbb.currency = Datastoree.create('data/currency.db');
dbb.categories = Datastoree.create('data/category.db');
const getCurrency = async () =>{
const browser = await playwright.chromium.launch({ headless: true, args: ['--start-maximized'] });
  const page = await browser.newPage();
  let currencyCodeSource = 'CNY', currencyCodeTarget = 'MGA';
  await page.goto(`https://www.google.com/search?hl=en&q=${currencyCodeSource}+to+${currencyCodeTarget}`);
  await page.waitForSelector('#knowledge-currency__updatable-data-column');
  const currencyExchange = await page.evaluate(() => {
    let today = new Date();
    let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    let dateTime = date+' '+time;
    return {
          'currency_source_value': parseFloat(document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('input')[0].getAttribute('value')),
          'currency_source_freebase_id': document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[0].options[document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[0].selectedIndex].getAttribute('value'),
          'currency_source_name': document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[0].options[document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[0].selectedIndex].text,
          'currency_target_value': parseFloat(document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('input')[1].getAttribute('value')),
          'currency_target_freebase_id': document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[1].options[document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[1].selectedIndex].getAttribute('value'),
          'currency_target_name': document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[1].options[document.getElementById('knowledge-currency__updatable-data-column').querySelectorAll('select')[1].selectedIndex].text,
          'date' : dateTime
         }
  });
  await currency.update({ _id: 'geirRD3a3E2UP51c' },{ $set: {
        'currency_source_value': currencyExchange.currency_source_value,
        'currency_source_freebase_id':currencyExchange.currency_source_freebase_id,
        'currency_source_name':currencyExchange.currency_source_name,
        'currency_target_value':currencyExchange.currency_target_value,
        'currency_target_freebase_id':currencyExchange.currency_target_freebase_id,
        'currency_target_name':currencyExchange.currency_target_name,
        'date': currencyExchange.date,
   }}, {}, function (err, docs) {
     if(err){
      console.log("erreur lors de la mis a jour du taux d'echange")
     }
     console.log('mis ajour du taux echange reussie')
   });
  /*await currency.insert(currencyExchange, function (err, newDoc) {
        console.log(newDoc);
    });*/
  await browser.close()
}
const getTaobaoCategory = async () =>{
  const browser = await playwright.chromium.launch({ headless: true, args: ['--start-maximized'] });
  const page = await browser.newPage();
  await page.goto('https://world.taobao.com/');
  await page.waitForSelector('#seo-category');
  const items = await page.evaluate(() => {
  let categorry=[]
  const elements = document.querySelector('#seo-category');
  const categoryList = elements.querySelector('.category-list');
  const categoryItems = categoryList.querySelectorAll('.category')
  for(category of categoryItems){
    categorry.push( {
       url : category.querySelector('a.category-link').href,
       name : category.querySelector('a.category-link').innerText.trim(),
     })
  }
  return categorry;
  })
  await categories.insert(items, function (err, newDoc) {
        console.log(newDoc);
    });
  await browser.close();
}
const translateCategory = async() =>{
  await categories.find({}, async function (err, docs) {
     for (var i = 0; i < docs.length; i++) {    
        await translate(docs[i].name,{
          to : 'fra'
        }).then(response =>{
          categories.update({ _id: docs[i]._id }, { $set: { name: response.trans_result.dst } }, {}, function () {
                console.log('OK');
          });
        
        }, function(err) {
            console.log(err)
        })
     }
  });
}
const getFeed = async () => {
  const browser = await playwright.chromium.launch({ headless: false, args: ['--start-maximized'] });
  const page = await browser.newPage();
  await page.goto('https://world.taobao.com/');
  await page.waitForSelector('.item-feed');
  await page.evaluate( () => {
    const wait = (duration) => { 
      console.log('waiting', duration);
      return new Promise(resolve => setTimeout(resolve, duration)); 
      };
    
      (async () => {
      
      window.atBottom = false;
      
      const scroller = document.documentElement;
      let lastPosition = -1;
      while(!window.atBottom) {
        scroller.scrollTop += 300;
        await wait(300);
        const currentPosition = scroller.scrollTop;
        if (currentPosition > lastPosition) {
        console.log('currentPosition', currentPosition);
        lastPosition = currentPosition;
        }
        else {
        window.atBottom = true;
        }
      }
      console.log('Done!');
    
      })();
 })
  await page.waitForFunction('window.atBottom == true', {
    timeout: 100000000,
    polling: 1000
    });
    const items = await page.$$eval('.item-feed a.item', links => links.map(item =>
    {
     return {
       url : item.href,
       image : item.querySelector('.item-image').src,
       title : item.querySelector('.item-title  span').textContent.trim(),
       price : item.querySelector('.item-price .price-text').textContent.trim(),
       bought : item.querySelector('.item-price .bought-text').textContent.trim(),
     }
    }));
  await browser.close()

};
app.post('/translate', async (req, res) => {
   const trad = await translate(req.body.text,{
      to : 'fra'
    }).then(response => response.trans_result.dst).catch(err=> req.body.text);
   res.send({traduction : trad,original : req.body.text})
});
app.post('/currency-convert',async (req,res)=> {
  const current_currency = await currency.find({_id :'geirRD3a3E2UP51c'},  (err, docs) =>{
    if(err)
    {
       res.send({
        YenToAriary:req.body.money
      })
    }
    res.send({
        YenToAriary:req.body.money * docs[0].currency_target_value
     })
  });
});
app.get('/upload-images',(req, res) => {
  res.json({ fileName: 'his place', filePath: `http://localhost:5000/img/1.jpg` });
})
// Upload endpoint
app.post('/upload', (req, res) => {
  if(req.files === null) {
    return res.status(400).json({msg: 'No file was uploaded'});
  }
  const file = req.files.file;

  file.mv(`${__dirname}/uploads/${file.name}`, err => {
    if(err) {
      console.error(err);
      return res.status(500).send(err);
    }
  
    res.json({ fileName: file.name, filePath: `http://localhost:5000/uploads/${file.name}` });
  });
});
app.use("/users", usersRoutes);
app.get("/category",async (req,res)=>{
  const categories=await dbb.categories.find({  })
    .then(response => response)
    .catch(err => {throw err})
     res.send(categories);
});
app.get('/api/pay', (req, res) => {
  return res.json("Payment Successful!");
});
app.use((err, req, res, next) => {
  console.log(err);
  const status = err.statusCode || 500;
  const message = err.message;
  const data = err.data;
  res.status(status).json({ message: message, errCode: status, data: data });
});
/*
 * * * * * *
  | | | | | |
  | | | | month
  | | | | | day of week
  | | | day of month
  | | hour
  | minute
  second ( optional )
*/
cron.schedule('59 23 * * *', function() {
  getCurrency();
  deleteInactiveUsers();
});
app.listen(PORT, () => {
  console.log(`**** SERVER STARTED AT PORT ${PORT} ****`);
});
