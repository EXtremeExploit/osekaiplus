// ==UserScript==
// @name         osekaiplus
// @namespace    https://pedro.moe
// @version      1.3.1
// @description  Show medal rankings count, make restriction banner smaller and other stuff
// @author       EXtemeExploit
// @match        http://osekai.net/*
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
// @run-at  document-start
// ==/UserScript==

/*global GM, $, GM_xmlhttpRequest, GM_setValue, GM_getValue, unsafeWindow */

(() => {
    "use strict";

    var MEDALS_RARITY_URL = "https://osekai.net/rankings/api/upload/scripts-rust/down_rarity.php"
    var MedalsRarityArray = []

    var deletedLowerTierProgressText = false
    var deletedLowerTierProgressTextId

    //document.getElementsByClassName("profiles__unachievedmedals-section-header-right")


    $(document).ready(reloadosekaiPlus);
    document.addEventListener('DOMContentLoaded', () => {
        // reloadosekaiPlus()
        if (typeof LoadRecentlyViewed !== 'undefined') LoadRecentlyViewed = LoadRecentlyViewedPatched
    })

    function reloadosekaiPlus() {
        if (document.URL.startsWith("https://osekai.net/rankings/?ranking=Medals&type=Rarity"))
            setTimeout(loadRarities, 500);

        if (document.URL.startsWith("https://osekai.net/profiles/?"))
            deletedLowerTierProgressTextId = setInterval(profilesDeleteLowerTierProgressText, 250);

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

        // TODO: find a way to apply this on normal website navigation
        function applyMedalRarities() {
            var iteration = getCurrentPage() * 50;
            let len = document.getElementsByClassName("rankings__cascade__content").length
            for (let i = 0; i < len; i++) {
                let element = document.getElementsByClassName("rankings__cascade__content")[i]
                if (element.innerHTML.startsWith('<p><span>') && element.innerHTML.includes('</span><span class="strong">') && element.innerHTML.endsWith("%</p>")) {
                    let inhtml = element.innerHTML;
                    inhtml = inhtml.replace('%', `% (${MedalsRarityArray[iteration++].count})`)
                    document.getElementsByClassName("rankings__cascade__content")[i].innerHTML = inhtml
                }
            }
        }

        function isProfileLoading() {
            let e = document.getElementById("global_loading_overlay")
            return e != null
        }

        function okToDeleteLowerTierText() {
            let e = document.getElementsByClassName("profiles__unachievedmedals-section-progress-inner-top")

            return e != null && !isProfileLoading()
        }

        function profilesDeleteLowerTierProgressText() {
            console.log("profilesDeleteLowerTierProgressText")
            while (!deletedLowerTierProgressText && okToDeleteLowerTierText()) {
                console.log("whileprofilesDeleteLowerTierProgressText")
                let progressMedalsCount = document.getElementsByClassName("profiles__unachievedmedals-section-progress-inner-top").length
                let hasProgressMedals = progressMedalsCount > 0
                if (hasProgressMedals) {
                    for (let i = 0; i < progressMedalsCount; i++) {
                        document.getElementsByClassName("profiles__unachievedmedals-section-progress-inner-top")[i].children[0].children[0].remove()
                    }
                    deletedLowerTierProgressText = true
                    clearInterval(deletedLowerTierProgressTextId)
                }
            }
        }
    }
})();

LoadRecentlyViewedPatched = () => {
    mostPopular = false;
    // if the user is logged out, set mostPopular to true
    if (nUserID == -1) {
        mostPopular = true;
    }

    mostPopularURL = "https://osekai.net/profiles/api/most_visited";
    recentlyViewedURL = "https://osekai.net/profiles/api/recent_visits";

    let xhr = new XMLHttpRequest();

    if (mostPopular) {
        xhr.open("GET", mostPopularURL, true);
    }
    else {
        xhr.open("GET", recentlyViewedURL, true);
    }

    xhr.onload = function () {
        if (this.status == 200) {
            let json = JSON.parse(this.responseText);
            let html = "";

            for (let i = 0; i < json.length; i++) {
                if (json[i].userdata == null) continue;
                html += `<div class="profiles__ranking-user" onclick="loadUser(${json[i].visited_id});"><img src="https://a.ppy.sh/${json[i].visited_id}" class="profiles__ranking-pfp">
            <div class="profiles__ranking-texts">
              <p class="profiles__ranking-username">${json[i].userdata.Username}</p>
            </div>
            </div>`;
            }

            document.getElementById("recentlyviewed").innerHTML = html;
        } else {
            console.log("error");
        }
    };

    xhr.send();
}
