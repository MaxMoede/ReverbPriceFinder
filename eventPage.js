//Author: Max Moede


const REVERB_PGID = "price_guide_id"; 
const REVERB_LISTINGS = "listings";

var myKey = this.MY_KEY;


//the onclicked callback function
//looks up listings by searching selection on reverb,
//then finds the most common price guide among the listings.
//It presents the average final asking price for the product.
//If no price guide exists, alerts user that there is no price guide.
function onClickHandler(info, tab) {
	var bkg = chrome.extension.getBackgroundPage();
	if (info.menuItemId == "radio1" || info.menuItemId == "radio2") {
		bkg.console.log("radio item " + info.menuItemId + 
					"was clicked (previous checked state was " + 
					info.wasChecked + ")");
	} else if (info.menuItemId == "checkbox1" || info.menuItemId == "checkbox2") {
		bkg.console.log(JSON.stringify(info));
		bkg.console.log("checkbox item " + info.menuItemId +
                " was clicked, state is now: " + info.checked +
                " (previous state was " + info.wasChecked + ")");
	} else {
		bkg.console.log("item " + info.menuItemId + " was clicked");
	    bkg.console.log("info: " + JSON.stringify(info));
	    bkg.console.log("tab: " + JSON.stringify(tab));
	}
	bkg.console.log("Before: " + info.selectionText);
  getPriceGuideID(info.selectionText, function(priceGuideID) {
    console.log("from click handler: price guide id is " + priceGuideID);
    getAverageLowPrice(priceGuideID, function(lowPrice){
      console.log("From click handler: low price is " + lowPrice);
      alert("Low price for " + info.selectionText + ": " + lowPrice);
    }, function(status){
      console.log("Low price was unable to be found.");
    });
  }, function() {
    console.log("no price guide id found...");
    alert("No price guide id found for " + info.selectionText);
  });
};


//function that attempts to access reverb's REST Api.
//if it works, json data is handled with @successHandler.
//if it fails, errorHandler is called.
var getJSON = function(url, successHandler, errorHandler) {
  var xhr = typeof XMLHttpRequest != 'undefined'
    ? new XMLHttpRequest()
    : new ActiveXObject('Microsoft.XMLHTTP');
  xhr.open('get', url, true);
  xhr.setRequestHeader('Authorization', 'Bearer ' + myKey);
  xhr.setRequestHeader('Accept-Version', '3.0');
  xhr.onreadystatechange = function() {
    var status;
    var data;
    if (xhr.readyState == 4) { 
      status = xhr.status;
      if (status == 200) {
        data = JSON.parse(xhr.responseText);
        successHandler && successHandler(data);
      } else {
        errorHandler && errorHandler(status);
      }
    }
  };
  xhr.send();
};

//function that takes in a string and returns the string
//with spaces converted to %20s
function turnSpacesToTwenty(someString){
  var newString =  encodeURIComponent(someString.trim());
  return newString;
}

//Function that searches for listings with @nameOfItem
//Finds the price guide of a relevant link.
//FOR FUTURE UPDATES: Consider going through all of the links found
//and using the price guide that pops up the most instead of choosing
//the first one.
function getPriceGuideID(nameOfItem, successHandler, errorHandler){
  var queryString = "https://api.reverb.com/api/listings/all?query=" 
                    + turnSpacesToTwenty(nameOfItem) + "&must_not=mod&page=1&per_page=24";
  console.log(queryString);
  theReq = getJSON(queryString, function(data){
    console.log(data);
    if (data[REVERB_LISTINGS].length <= 0){
      console.log("No listings found...");
      return;
    }
    var allListings = data[REVERB_LISTINGS];
    var priceGuideDict = {};
    for (var eachListing in allListings){
      if (allListings[eachListing].hasOwnProperty(REVERB_PGID)){
        var PGID = allListings[eachListing][REVERB_PGID];
        if (PGID in priceGuideDict){
          priceGuideDict[PGID] += 1;
        } else {
          priceGuideDict[PGID] = 1;
        }
      }
    }
    if (Object.keys(priceGuideDict).length == 0){
      errorHandler();
      return
    } else {
      var mostCommonPG = Object.keys(priceGuideDict).reduce((a, b) => priceGuideDict[a] > priceGuideDict[b] ? a : b);
      successHandler(mostCommonPG);
      return;
    }
  }, function(status){
    console.log("This shouldn't be showing up...")
    console.log(status);
  });
}

//function that calculates the average final sale price
//of a certain price guide id.
function getAverageLowPrice(priceGuideID, successHandler, errorHandler){
  var queryString = "https://api.reverb.com/api/priceguide/" + priceGuideID 
                    + "/transactions/summary?condition=used";
  theReq = getJSON(queryString, function(data){
    var averageFinalPriceSum = 0;
    var numPrices = 0;
    console.log(data);
    console.log("There u go");
    for (var eachPriceInd in data["summaries"]){
      var thePrice = data["summaries"][eachPriceInd]["average_price_final"]["amount"];
      averageFinalPriceSum += parseFloat(thePrice);
      numPrices += 1;
    }
    var avgPrice = averageFinalPriceSum / numPrices;
    console.log("average price: " + avgPrice);
    if (avgPrice != 0){
      successHandler(avgPrice);
    } else {
      errorHandler();
    }
  }, function(status){
    console.log("The request could not be completed...");
    console.log(status);
  });
}

chrome.contextMenus.onClicked.addListener(onClickHandler);

// Set up context menu tree at install time.
chrome.runtime.onInstalled.addListener(function() {
  // Create one test item for each context type.
  var contexts = ["page","selection","link","editable","image","video",
                  "audio"];
  for (var i = 0; i < contexts.length; i++) {
    var context = contexts[i];
    var title = "Lookup '" + context + "' on reverb";
    var id = chrome.contextMenus.create({"title": title, "contexts":[context],
                                         "id": "context" + context});
    console.log("'" + context + "' item:" + id);
  }

  // Create a parent item and two children.
  chrome.contextMenus.create({"title": "Test parent item", "id": "parent"});
  chrome.contextMenus.create(
      {"title": "Child 1", "parentId": "parent", "id": "child1"});
  chrome.contextMenus.create(
      {"title": "Child 2", "parentId": "parent", "id": "child2"});
  console.log("parent child1 child2");

  // Create some radio items.
  chrome.contextMenus.create({"title": "Radio 1", "type": "radio",
                              "id": "radio1"});
  chrome.contextMenus.create({"title": "Radio 2", "type": "radio",
                              "id": "radio2"});
  console.log("radio1 radio2");

  // Create some checkbox items.
  chrome.contextMenus.create(
      {"title": "Checkbox1", "type": "checkbox", "id": "checkbox1"});
  chrome.contextMenus.create(
      {"title": "Checkbox2", "type": "checkbox", "id": "checkbox2"});
  console.log("checkbox1 checkbox2");

  // Intentionally create an invalid item, to show off error checking in the
  // create callback.
  /*console.log("About to try creating an invalid item - an error about " +
      "duplicate item child1 should show up");
  chrome.contextMenus.create({"title": "Oops", "id": "child1"}, function() {
    if (chrome.extension.lastError) {
      console.log("Got expected error: " + chrome.extension.lastError.message);
    }
  });*/
});