// ==UserScript==
// @name        osekaiplus
// @namespace   https://pedro.moe
// @version     1.7.2
// @description Improve user experience on osekai.net (osu! medals website)
// @author      EXtemeExploit
// @match       http://osekai.net/*
// @match       https://osekai.net/*

// @noframes
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js
// @run-at  	document-start
// ==/UserScript==

/* global $, document, window, XMLHttpRequest, nUserID, colMedals, LoadRecentlyViewed, positionNav */

(() => {
	'use strict';

	var MEDALS_RARITY_URL = 'https://osekai.net/rankings/api/upload/scripts-rust/down_rarity.php';
	var MedalsRarityArray = []; // This one is sorted by rarity

	$(document).ready(reloadosekaiPlus);

	// Function to override to fix them or something
	document.addEventListener('DOMContentLoaded', () => {
		if (typeof LoadRecentlyViewed !== 'undefined') LoadRecentlyViewed = LoadRecentlyViewedPatched;
	});

	function reloadosekaiPlus() {
		setInterval(giveMedalsRarityRankingCountLoader, 250);
		setInterval(giveColorsToUsersInRankingsLoader, 250);
		setInterval(profilesPatchesLoader, 250);
		setInterval(giveMedalsRarityCountLoader, 250);

		simplifyRescrictionBanner(); // This doesn't need an interval


		function simplifyRescrictionBanner() {
			// Only apply is the rescriction banner exists
			if (document.getElementsByClassName('osekai__navbar-restriction').length) {
				document.getElementsByClassName('osekai__navbar-restriction')[0].remove();

				// Put Account restriction text
				let inhtml = document.getElementsByClassName('osekai__navbar-right')[0].innerHTML;
				inhtml = `<p>Account Restricted</p>${inhtml}`;
				document.getElementsByClassName('osekai__navbar-right')[0].innerHTML = inhtml;

				// defined by osekai to position navbar and content accordingly
				positionNav();
			}
		}

		async function getMedalsCount() {
			return new Promise((resolve) => {
				var xhr = new XMLHttpRequest();
				xhr.open('GET', MEDALS_RARITY_URL, true);
				xhr.onload = () => {
					if (xhr.status === 200) {
						var oResponse = JSON.parse(xhr.responseText);
						resolve(oResponse.sort((a, b) => {
							return a.count - b.count;
						}));
					}
				};
				xhr.send();
			});
		}

		/**
		 * 
		 * @returns Current page minus 1, so first page is 0
		 */
		function getCurrentPage() {
			let element = document.getElementsByClassName('osekai__pagination_item-active')[0];
			return parseInt(element.innerHTML) - 1;
		}

		async function giveMedalsRarityRankingCountLoader() {
			if (document.URL.startsWith('https://osekai.net/rankings/?ranking=Medals&type=Rarity')) {
				// Want to get medals rarity count first, await it so no race condition
				if (MedalsRarityArray.length == 0)// Only make the request if needed
					MedalsRarityArray = await getMedalsCount();
				giveMedalsRarityRankingCount();
			}
		}

		async function giveMedalsRarityRankingCount() {
			if (document.getElementsByClassName('osekai__pagination_item-active')[0] == null) return; // page isn't finished loading yet
			var iteration = getCurrentPage() * 50;
			let len = document.getElementsByClassName('rankings__cascade__content').length;
			for (let i = 0; i < len; i++) {
				let element = document.getElementsByClassName('rankings__cascade__content')[i];
				if (element.innerHTML.startsWith('<p><span>') && element.innerHTML.includes('</span><span class="strong">') && element.innerHTML.endsWith('%</p>')) {
					let inhtml = element.innerHTML;
					inhtml = inhtml.replace('%', `% (${MedalsRarityArray[iteration++].count})`);
					document.getElementsByClassName('rankings__cascade__content')[i].innerHTML = inhtml;
				}
			}
		}


		async function giveColorsToUsersInRankingsLoader() {
			if (!document.URL.startsWith('https://osekai.net/rankings/?ranking=Medals&type=Users')) return; // Not in correct place
			if (!document.getElementsByClassName('strong user_hover_v2').length > 0) return; // users didn't load yet
			if (!document.getElementsByClassName('strong user_hover_v2')[0].style.color == '') return; // user is already colored
			giveColorsToUsersInRankings();
		}


		async function giveColorsToUsersInRankings() {
			let usersCount = document.getElementsByClassName('strong user_hover_v2').length;
			for (let i = 0; i < usersCount; i++) {
				document.getElementsByClassName('strong user_hover_v2')[i].style.color = 'rgb(var(--maincol))';
			}
		}

		async function profilesPatchesLoader() {
			if (document.URL.startsWith('https://osekai.net/profiles/?'))
				profilesPatches();
		}

		/**
		 * Delete lower tier progress text, more info on unachieved medals headers
		 */
		function profilesPatches() {
			let progressMedalsCount = document.getElementsByClassName('profiles__unachievedmedals-section-progress-inner-top').length;
			let hasProgressMedals = progressMedalsCount > 0;
			if (hasProgressMedals) {
				for (let i = 0; i < progressMedalsCount; i++) {
					if (document.getElementsByClassName('profiles__unachievedmedals-section-progress-inner-top')[i].children[0].children[1] == null) continue;
					document.getElementsByClassName('profiles__unachievedmedals-section-progress-inner-top')[i].children[0].children[0].remove();
				}
			}

			// Add more info to headers
			let sectionsCount = document.getElementsByClassName('profiles__unachievedmedals-section-header-right').length;
			for (var i = 0; i < sectionsCount; i++) {
				if (document.getElementsByClassName('profiles__unachievedmedals-section-header-right')[i].children[2] != null) continue;
				let sectionHas = parseInt(document.getElementsByClassName('profiles__unachievedmedals-section-header-right')[i].children[0].innerHTML);
				let sectionTotal = parseInt(document.getElementsByClassName('profiles__unachievedmedals-section-header-right')[i].children[1].innerHTML.substring(1));

				let inhtml = document.getElementsByClassName('profiles__unachievedmedals-section-header-right')[i].innerHTML;
				inhtml += ` <span id="unobtained_progress_">(${((sectionHas / sectionTotal) * 100).toFixed(0)}% | ${sectionTotal - sectionHas} remaining)</span>`;
				document.getElementsByClassName('profiles__unachievedmedals-section-header-right')[i].innerHTML = inhtml;
			}
		}

		async function giveMedalsRarityCountLoader() {
			if (document.URL.startsWith('https://osekai.net/medals/?')) {
				// Want to get medals rarity count first, await it so no race condition
				if (MedalsRarityArray.length == 0)// Only make the request if needed
					MedalsRarityArray = await getMedalsCount();
				giveMedalsRarityCount();
			}
		}

		function giveMedalsRarityCount() {
			if (document.getElementById('strMedalRarity') && document.getElementById('strMedalRarity').innerHTML.endsWith('%')) {
				let params = new URLSearchParams(window.location.search);
				let medalID = colMedals[params.get('medal')].MedalID;
				var result = MedalsRarityArray.filter((e) => {
					return e.id == medalID;
				});
				document.getElementById('strMedalRarity').innerHTML += ` (${result[0].count})`;

			}

		}
	}
})();

function LoadRecentlyViewedPatched() {
	let mostPopular = false;
	// if the user is logged out, set mostPopular to true
	if (nUserID == -1) {
		mostPopular = true;
	}

	let xhr = new XMLHttpRequest();

	let url = '';
	if (mostPopular)
		url = 'https://osekai.net/profiles/api/most_visited';
	else
		url = 'https://osekai.net/profiles/api/recent_visits';
	xhr.open('GET', url, true);
	xhr.onload = function () {
		if (this.status == 200) {
			let json = JSON.parse(this.responseText);
			let html = '';

			for (let i = 0; i < json.length; i++) {
				if (json[i].userdata == null) continue;
				html += `<div class="profiles__ranking-user" onclick="loadUser(${json[i].visited_id});"><img src="https://a.ppy.sh/${json[i].visited_id}" class="profiles__ranking-pfp">
            <div class="profiles__ranking-texts">
              <p class="profiles__ranking-username">${json[i].userdata.Username}</p>
            </div>
            </div>`;
			}

			document.getElementById('recentlyviewed').innerHTML = html;
		} else {
			console.log('error');
		}
	};

	xhr.send();
}
