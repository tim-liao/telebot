const TeleBot = require("telebot");
const bot = new TeleBot("TELEGRAM_BOT_TOKEN");
//https://www.ruyut.com/2020/03/js-https-get.html
var https = require("https");
var fs = require("fs");

var url =
  "https://data.epa.gov.tw/api/v1/aqx_p_432?limit=1000&api_key=9be7b239-557b-4c10-9775-78cadfc555e9&sort=ImportDate%20desc&format=json";
let CountySet = new Set();
let siteNameSet = new Set();
let Data = new Array();
let buttonArea; //判斷每個按鈕不同的使用情境的變數
let inlineButtonHere;
let setUpTimeSiteName;
let job;
var CronJob = require("cron").CronJob;
const dataRun = function () {
  https.get(url, function (response) {
    var data = "";
    //console.log("start");
    response.on("data", (chunk) => {
      //console.log("on data");
      data += chunk;
    });

    response.on("end", () => {
      data = JSON.parse(data); //轉換成JS
      Data = data;

      //console.log(data.records[0].SiteName);
      console.log("已跑完");
    });
  });
};
dataRun();
const countrySearch = function () {
  for (let i = 0; i < Data.records.length; i++) {
    CountySet.add(Data.records[i].County);
  }
  const cityQuery = [];
  const countySetArray = [...CountySet];
  for (let i = 0; i < countySetArray.length; i++) {
    let separateArray = [];
    separateArray.push(countySetArray[i]);
    cityQuery.push(separateArray);
  }
  inlineButtonHere = [];
  for (let i = 0; i < cityQuery.length / 5; i++) {
    if (inlineButtonHere[i] == undefined) {
      inlineButtonHere[i] = [
        bot.inlineButton(`${cityQuery[i * 5]}`, {
          callback: `${cityQuery[i * 5]}`,
          //stage: "country", country: cityQuery[bla],
        }),
      ];
    }
    for (let y = 0; y < 5; y++) {
      if (inlineButtonHere[i].length < 5 && cityQuery[i * 5 + 1 + y]) {
        //因為cityQuery[i * 5 + 1 + y]不一定存在
        inlineButtonHere[i].push(
          bot.inlineButton(`${cityQuery[i * 5 + 1 + y]}`, {
            //這邊"+1"是因為cityQuery[i * 5  + y]在上面已經被加入
            callback: `${cityQuery[i * 5 + 1 + y]}`,
          })
        );
      }
    }
  }
};
const siteNameSearch = function (msg) {
  siteNameSet.clear();
  //console.log(`${msg.data}` + buttonArea + "7777777");
  for (let i = 0; i < Data.records.length; i++) {
    if (Data.records[i].County == `${msg.data}`) {
      siteNameSet.add(Data.records[i].SiteName);
    }
  }

  const siteNameQuery = [];
  const siteNameSetArray = [...siteNameSet];
  for (let i = 0; i < siteNameSetArray.length; i++) {
    let separateArray = [];
    separateArray.push(siteNameSetArray[i]);
    siteNameQuery.push(separateArray);
  }
  inlineButtonHere = [];
  for (let i = 0; i < siteNameQuery.length / 5; i++) {
    if (inlineButtonHere[i] == undefined) {
      inlineButtonHere[i] = [
        bot.inlineButton(`${siteNameQuery[i * 5]}`, {
          callback: `${siteNameQuery[i * 5]}`,
        }),
      ];
    }
    for (let y = 0; y < 5; y++) {
      if (inlineButtonHere[i].length < 5 && siteNameQuery[i * 5 + 1 + y]) {
        //因為siteNameQuery[i * 5 + 1 + y]不一定存在
        inlineButtonHere[i].push(
          bot.inlineButton(`${siteNameQuery[i * 5 + 1 + y]}`, {
            //這邊"+1"是因為siteNameQuery[i * 5  + y]在上面已經被加入
            callback: `${siteNameQuery[i * 5 + 1 + y]}`,
          })
        );
      }
    }
  }
};
bot.on(["/start", "/back"], (msg) => {
  let replyMarkup = bot.keyboard(
    [
      ["/start", "/hide", "/stop"],
      ["/setUpTimedNotifications", "/instantInformation"],
    ],
    { resize: true }
  );

  return bot.sendMessage(msg.from.id, "空氣品質查詢選單", {
    replyMarkup,
  });
});
bot.on("/hide", (msg) => {
  return bot.sendMessage(msg.from.id, "已隱藏快捷鍵，請按 /start 再次顯示.", {
    replyMarkup: "hide",
  });
});

bot.on("/instantInformation", (msg) => {
  buttonArea = "instantInformation";
  countrySearch();
  //console.log(inlineButtonHere);
  let replyMarkup = bot.inlineKeyboard(inlineButtonHere);

  return bot.sendMessage(msg.from.id, "選擇你要查詢的區域", {
    replyMarkup,
  });
});

// Inline button callback
bot.on("callbackQuery", (msg) => {
  //這是第二個此部分的第二個callback，因為我設定一個變數去判別是否需要回應此項callback，同時在跑callback的時候會從上到下都去跑跑看，所以後面的步驟放前面才不會重複執行
  if (buttonArea == "instantInformationCounty" && siteNameSet.has(msg.data)) {
    //console.log(`跑前${msg.data}`);

    //console.log(`跑中data是${msg.data},siteNameHere是${siteNameHere}`);
    dataRun();
    let dataProcess;
    for (let i = 0; i < Data.records.length; i++) {
      //console.log(`有跑${i + 1}次`);
      if (msg.data == Data.records[i].SiteName) {
        //console.log(`有進來!`);
        dataProcess = Data.records[i];
        //console.log(`replyMarkup是${replyMarkup}`);
        break;
      }
    }
    //console.log(dataProcess);
    ///以下是把各測站的資訊與中文對上的code
    let fieldsObject = {};
    const addFieldsObject = function (keys, values) {
      return (fieldsObject[keys] = values);
    };
    for (let i = 0; i < Data.fields.length; i++) {
      let fieldsKeys = Data.fields[i].id;
      let fieldsValues = Data.fields[i].info.label;
      addFieldsObject(fieldsKeys, fieldsValues);
    }
    //console.log(fieldsObject);
    ////
    let fieldsObjectAllkeys = Object.keys(fieldsObject);
    let outout = "";
    for (let i = 0; i < fieldsObjectAllkeys.length; i++) {
      let fieldsValues = fieldsObject[`${fieldsObjectAllkeys[i]}`];
      let dataProcessValues = dataProcess[`${fieldsObjectAllkeys[i]}`];
      //console.log(
      //  `i=${i},fieldsValues=${fieldsValues},dataProcessValues=${dataProcessValues}`
      // );
      outout += `${fieldsValues} 為 ${dataProcessValues || "無"}\n`;
    }
    let replyMarkup = bot.sendMessage(msg.from.id, outout);
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    //console.log(outout);
    //console.log(`跑後data是${msg.data},siteNameHere是${siteNameHere}`);
    return bot.sendMessage(
      msg.from.id,
      `這是你要的 ${msg.data} 即時空氣品質資訊`,
      { replyMarkup }
    );
  }
});

bot.on("callbackQuery", (msg) => {
  //console.log(`${msg.data}` + buttonArea + "666666");
  if (buttonArea == "instantInformation") {
    siteNameSearch(msg);
    // console.log(inlineButtonHere);
    let replyMarkup = bot.inlineKeyboard(inlineButtonHere);
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    buttonArea = "instantInformationCounty";
    //console.log(buttonArea + "123123123");
    return bot.sendMessage(msg.from.id, `請在 ${msg.data} 選擇你要查詢的地區`, {
      replyMarkup,
    });
  }
});
bot.on("/stop", (message) => {
  if (job) {
    job.stop();
    bot.sendMessage(message.chat.id, "已停止每日定時推送資訊");
    //console.log(job);
  } else {
    bot.sendMessage(message.chat.id, "未設置每日定時推送");
  }
});
bot.on("callbackQuery", (msg) => {
  //console.log(`${msg.data}` + buttonArea + "666666");
  if (buttonArea == "setUpTimedNotificationsTime") {
    //有和上面重複
    ////////////////////////////////////////////////////////////////////////////////////////

    //console.log(`跑前${msg.data}`);

    //console.log(`跑中data是${msg.data},siteNameHere是${siteNameHere}`);
    dataRun();
    let dataProcess;
    for (let i = 0; i < Data.records.length; i++) {
      //console.log(`有跑${i + 1}次`);
      if (setUpTimeSiteName == Data.records[i].SiteName) {
        //console.log(`有進來!`);
        dataProcess = Data.records[i];
        //console.log(`replyMarkup是${replyMarkup}`);
        break;
      }
    }
    //console.log(dataProcess);
    ///以下是把各測站的資訊與中文對上的code
    let fieldsObject = {};
    const addFieldsObject = function (keys, values) {
      return (fieldsObject[keys] = values);
    };
    for (let i = 0; i < Data.fields.length; i++) {
      let fieldsKeys = Data.fields[i].id;
      let fieldsValues = Data.fields[i].info.label;
      addFieldsObject(fieldsKeys, fieldsValues);
    }
    //console.log(fieldsObject);
    ////
    let fieldsObjectAllkeys = Object.keys(fieldsObject);
    let outout = "";
    for (let i = 0; i < fieldsObjectAllkeys.length; i++) {
      let fieldsValues = fieldsObject[`${fieldsObjectAllkeys[i]}`];
      let dataProcessValues = dataProcess[`${fieldsObjectAllkeys[i]}`];
      //console.log(
      //  `i=${i},fieldsValues=${fieldsValues},dataProcessValues=${dataProcessValues}`
      // );
      outout += `${fieldsValues} 為 ${dataProcessValues || "無"}\n`;
    }

    //console.log(outout);
    //console.log(`跑後data是${msg.data},siteNameHere是${siteNameHere}`);

    ////////////////////////////////////////////////////////////////////////////////////////////
    //console.log(msg.data);
    let cronTimeHere = "* * " + msg.data + " * * *";
    console.log(cronTimeHere);
    job = new CronJob(cronTimeHere, () => {
      bot.sendMessage(msg.from.id, outout);
    });
    job.start();
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    buttonArea = "setUpTimedNotificationsTime";
    //console.log(buttonArea + "123123123");
    return bot.sendMessage(
      msg.from.id,
      `已設定 ${setUpTimeSiteName} 於每日 ${msg.data} 點提醒`
    );
  }
});
bot.on("callbackQuery", (msg) => {
  //console.log(`${msg.data}` + buttonArea + "666666");
  if (buttonArea == "setUpTimedNotificationsCounty") {
    setUpTimeSiteName = msg.data;
    console.log(setUpTimeSiteName);
    const inlineButtonHere = [
      [
        bot.inlineButton("1點", { callback: "1" }),
        bot.inlineButton("2點", { callback: "2" }),
        bot.inlineButton("3點", { callback: "3" }),
        bot.inlineButton("4點", { callback: "4" }),
        bot.inlineButton("5點", { callback: "5" }),
        bot.inlineButton("6點", { callback: "6" }),
      ],
      [
        bot.inlineButton("7點", { callback: "7" }),
        bot.inlineButton("8點", { callback: "8" }),
        bot.inlineButton("9點", { callback: "9" }),
        bot.inlineButton("10點", { callback: "10" }),
        bot.inlineButton("11點", { callback: "11" }),
        bot.inlineButton("12點", { callback: "12" }),
      ],
      [
        bot.inlineButton("13點", { callback: "13" }),
        bot.inlineButton("14點", { callback: "14" }),
        bot.inlineButton("15點", { callback: "15" }),
        bot.inlineButton("16點", { callback: "16" }),
        bot.inlineButton("17點", { callback: "17" }),
        bot.inlineButton("18點", { callback: "18" }),
      ],
      [
        bot.inlineButton("19點", { callback: "19" }),
        bot.inlineButton("20點", { callback: "20" }),
        bot.inlineButton("21點", { callback: "21" }),
        bot.inlineButton("22點", { callback: "22" }),
        bot.inlineButton("23點", { callback: "23" }),
        bot.inlineButton("24點", { callback: "24" }),
      ],
    ];
    let replyMarkup = bot.inlineKeyboard(inlineButtonHere);

    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    buttonArea = "setUpTimedNotificationsTime";
    //console.log(buttonArea + "123123123");
    return bot.sendMessage(
      msg.from.id,
      `請在 ${msg.data} 選擇你要每日提醒的時間`,
      {
        replyMarkup,
      }
    );
  }
});
bot.on("callbackQuery", (msg) => {
  //console.log(`${msg.data}` + buttonArea + "666666");
  if (buttonArea == "setUpTimedNotifications") {
    siteNameSearch(msg);
    // console.log(inlineButtonHere);
    let replyMarkup = bot.inlineKeyboard(inlineButtonHere);
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    buttonArea = "setUpTimedNotificationsCounty";
    //console.log(buttonArea + "123123123");
    return bot.sendMessage(
      msg.from.id,
      `請在 ${msg.data} 選擇你要要設定定時提醒的地區`,
      {
        replyMarkup,
      }
    );
  }
});
bot.on("/setUpTimedNotifications", (msg) => {
  buttonArea = "setUpTimedNotifications";
  countrySearch();
  //console.log(inlineButtonHere);
  let replyMarkup = bot.inlineKeyboard(inlineButtonHere);

  return bot.sendMessage(msg.from.id, "請選擇你要設定定時提醒的區域", {
    replyMarkup,
  });
});

bot.start();
