// ==UserScript==
// @name         osekaiplus
// @namespace    https://pedro.moe
// @version      1.0.0
// @description  Show medal rankings count, make restriction banner smaller and other stuff
// @author       EXtemeExploit
// @match        https://osekai.net/*
// @match        https://osekai.net/*

// @noframes
// @grant        GM.xmlHttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @require      http://timeago.yarp.com/jquery.timeago.js
// ==/UserScript==

/*global GM, $, GM_xmlhttpRequest, GM_setValue, GM_getValue, unsafeWindow */

(() => {
    "use strict";

    var MEDALS_RARITY_URL = "https://osekai.net/rankings/api/upload/scripts-rust/down_rarity.php"
    var MedalsRarityArray = []


    $(document).ready(reloadosekaiPlus);

    function reloadosekaiPlus() {
        if (document.URL.startsWith("https://osekai.net/rankings/?ranking=Medals&type=Rarity"))
            setTimeout(loadRarities, 2000);

        function loadRarities() {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", MEDALS_RARITY_URL, true);
            xhr.send();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 3 && xhr.status === 200) {
                    var oResponse = JSON.parse(xhr.responseText);
                    MedalsRarityArray = oResponse.sort(function (a, b) {
                        return a.count - b.count
                    });
                    applyMedalRarities();
                };
            };
            raritiesApplyPageListeners()
        }

        function raritiesApplyPageListeners() {
            Array.prototype.forEach.call(document.getElementsByClassName("osekai__pagination")[1].children, (e) => {
                e.addEventListener('click', () => {
                    raritiesApplyPageListeners()
                    applyMedalRarities()
                })
            });
        }

        /**
         * 
         * @returns Current page minus 1, so first page is 0
         */
        function getCurrentPage() {
            let element = document.getElementsByClassName("osekai__pagination_item-active")[0]
            return parseInt(element.innerHTML) - 1;
        }

        function applyMedalRarities() {
            console.log("Applying medal rarities")
            var iteration = getCurrentPage() * 50;
            let len = document.getElementsByClassName("rankings__cascade__content").length
            for (let i = 0; i < len; i++) {
                let element = document.getElementsByClassName("rankings__cascade__content")[i]
                if (element.innerHTML.startsWith('<p><span>held by </span><span class="strong">') && element.innerHTML.endsWith("%</p>")) {
                    let inhtml = element.innerHTML;
                    inhtml = inhtml.replace('%', `% (${MedalsRarityArray[iteration++].count})`)
                    document.getElementsByClassName("rankings__cascade__content")[i].innerHTML = inhtml
                }
            }
        }
    }

})();
