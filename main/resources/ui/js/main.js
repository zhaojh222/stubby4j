var MINI = require('minified');
var $ = MINI.$, $$ = MINI.$$, EE = MINI.EE;
var divFactory = EE('div');
var anchorFactory = EE('a');
var strongFactory = EE('strong');

$(function () {
   $.ready(function () {
      bindLinks();
      var checkForStatsTimeout = setTimeout(function() { checkForStats(); }, 1000);
      function checkForStats() {
         var statsPresent = false;
         $.request('get', "/ajax/stats/check").then(
            function success(content) {
               statsPresent = (/^true$/i).test(content.replace(/^\s+|\s+$/g, ''))
               if (statsPresent === true) {
                  clearTimeout(checkForStatsTimeout);
                  var parentTD = document.evaluate('//td[contains(text(), "No requests were made")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE).snapshotItem(0);
                  parentTD = $(parentTD);
                  rebindAjaxLink(parentTD, "/ajax/stats", ajaxToStatsClickHandler);
               } else {
                  checkForStatsTimeout = setTimeout(function() { checkForStats(); }, 1000);
               }
            },
            function error(status, statusText, responseText) {
               requestErrorHandler(status, statusText, responseText, null, null, null);
         });
         return false;
      }
   });
});

function bindLinks() {
   $('.ajax-stats').on('click', ajaxToStatsClickHandler);
   $('.ajax-resource').on('click', ajaxToResourceClickHandler);
}

function ajaxToStatsClickHandler() {
   var thisLink = $$(this);
   // TD/STRONG/A
   var parentTD = thisLink.parentNode.parentNode;
   $(parentTD).set("innerHTML", "<img align='baseline' src='/images/loading.gif' border='0' />");

   $.request('get', thisLink.href).then(
      function success(content) {
         var popupWithCsvWithin = content.replace(/^\s+|\s+$/g, '');

         displayPopupWithContent(thisLink, $(parentTD), popupWithCsvWithin, ajaxToStatsClickHandler);
         var divStatsHolder = '#inner-dialog-stats';
         var csv = $(divStatsHolder).get('innerHTML');
         $(divStatsHolder).set('innerHTML', '');

         var margin = {top: 20, right: 20, bottom: 30, left: 40},
            width = 510 - margin.left - margin.right,
            height = 200 - margin.top - margin.bottom;

         var x = d3.scale.ordinal()
            .rangeRoundBands([0, width], .3);

         var y = d3.scale.linear()
            .range([height, 0]);

         var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

         var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

         var svg = d3.select(divStatsHolder).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

         var data = d3.csv.parse(csv, stringToInt);
         var maxYAxis = d3.max(data, function(d) {
            return d.hits;
         });

         x.domain(data.map(function(d) { return d.resourceId; }));
         y.domain([0, maxYAxis]);

         svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .append("text")
            .attr("x", "30%")
            .attr("dy", "2.8em")
            .text("x-stubby-resource-id");

         svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("hits");

         svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d.resourceId); })
            .attr("width", x.rangeBand())
            .attr("y", function(d) { return y(d.hits); })
            .attr("height", function(d) { return height - y(d.hits); });

         d3.select("#sort-values-box").on("change", sortColumns);
         var sortTimeout = setTimeout(function() {
            d3.select("#sort-values-box").property("checked", true).each(sortColumns);
         }, 1500);

         function stringToInt(d) {
            d.hits = +d.hits;
            return d;
         }

         function sortColumns() {
            clearTimeout(sortTimeout);
            // Copy-on-write since tweens are evaluated after a delay.
            var x0 = x.domain(data.sort(this.checked
                     ? function(a, b) { return b.hits - a.hits; }
                     : function(a, b) { return d3.ascending(a.resourceId, b.resourceId); })
                  .map(function(d) { return d.resourceId; }))
               .copy();

            var transition = svg.transition().duration(1250),
               delay = function(d, i) { return i * 50; };

            transition.selectAll(".bar")
               .delay(delay)
               .attr("x", function(d) { return x0(d.resourceId); });

            transition.select(".x.axis")
               .call(xAxis)
               .selectAll("g")
               .delay(delay);
         }
      },
      function error(status, statusText, responseText) {
         requestErrorHandler(status, statusText, responseText, thisLink, parentTD, ajaxToStatsClickHandler);
      });
   return false;
}



function ajaxToResourceClickHandler() {
   var thisLink = $$(this);
   // TD/STRONG/A
   var parentTD = thisLink.parentNode.parentNode;
   $(parentTD).set("innerHTML", "<img align='baseline' src='/images/loading.gif' border='0' />");

   $.request('get', thisLink.href).then(
      function success(content) {
         var popupWithContent = content.replace(/^\s+|\s+$/g, '');
         displayPopupWithContent(thisLink, $(parentTD), popupWithContent, ajaxToResourceClickHandler);
         hljs.highlightBlock($$("code#ajax-response"));
      },
      function error(status, statusText, responseText) {
         requestErrorHandler(status, statusText, responseText, thisLink, parentTD, ajaxToResourceClickHandler);
      });
   return false;
}

function requestErrorHandler(status, statusText, responseText, thisLink, parentTD, thisLinkHandlerFunction) {
   var status = parseInt(status);
   if (status === 0) {
      alert("Could not contact the stubby4j backend when fetching resource:\n" + thisLink + "\n\nIs stubby4j app UP?");
   } else {
      alert("Error fetching resource:\n" + thisLink + "\n\nstatus: " + status + "\nstatusText: " + statusText + "\nresponseText: " + responseText);
   }
   //rebindAjaxLink(parentTD, thisLink, thisLinkHandlerFunction);
}

function rebindAjaxLink(parentTD, href, thisLinkHandlerFunction) {
   var anchor = anchorFactory()[0];
   $(anchor).set({'@href': href, $: '+ajaxified', 'innerHTML': '[view]'});
   $(anchor).on('click', thisLinkHandlerFunction);

   var strong = strongFactory()[0];
   parentTD.set('innerHTML', '');
   parentTD.add($(strong).add($(anchor)));
}

function displayPopupWithContent(thisLink, parentTD, popupHtmlWithContent, thisLinkHandlerFunction) {
   var body = document.body;
   var html = document.documentElement;

   var divRemovable = divFactory()[0];
   $(divRemovable).set({'@id': "popup-placeholder", 'innerHTML': popupHtmlWithContent});
   $('body').add($(divRemovable));

   var divPopupMask = 'div#popup-mask';
   $(divPopupMask).set({$display: 'block', $opacity: '0.4', $width: getMaskWidth() + 'px', $height: getMaskHeight() + 'px'});

   var divPopupWindow = 'div#popup-window';
   $(divPopupWindow).set({$display: 'block'});
   $(divPopupWindow).set({$top: getTopCoord() + "px", $left: getLeftCoord() + "px"});

   $(divPopupWindow + ' .close-dialog').on('click', function () {
      closePopupAndResetHandler();
   });

   $(divPopupWindow + ' .dialog-dismiss').on('click', function () {
      closePopupAndResetHandler();
   });

   $(divPopupMask).on('click', function () {
      closePopupAndResetHandler();
   });

   document.onkeydown = function (event) {
      if (event.keyCode === 27) { //ESC key
         closePopupAndResetHandler();
      }
   }

   function getMaskHeight() {
      return Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight, window.innerHeight);
   }

   function getMaskWidth() {
      return Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth, window.innerWidth);
   }

   function getTopCoord() {
      return (window.innerHeight / 2 - $$(divPopupWindow).offsetHeight / 2);
   }

   function getLeftCoord() {
      return (window.innerWidth / 2 - $$(divPopupWindow).offsetWidth / 2);
   }

   function closePopupAndResetHandler() {
      closeDialog();
      rebindAjaxLink(parentTD, thisLink, thisLinkHandlerFunction);
   }

   function closeDialog() {
      $(divPopupWindow).animate({$$fade: 0}, 250).then(function() {
         $(divPopupWindow).remove();
      });
      $(divPopupMask).animate({$$fade: 0}, 250).then(function() {
         $(divPopupMask).remove();
      });
      $("div#popup-placeholder").remove();
   }

   window.onresize = function(event) {
      $(divPopupMask).set({$width: getMaskWidth() + 'px', $height: getMaskHeight() + 'px'});
      $(divPopupWindow).set({$top: getTopCoord() + 'px', $left: getLeftCoord() + 'px'});
   }
}