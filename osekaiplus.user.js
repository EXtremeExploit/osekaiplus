// ==UserScript==
// @name        osekaiplus
// @namespace   https://pedro.moe
// @version     1.8.12
// @description Improve user experience on osekai.net (osu! medals website)
// @author      EXtemeExploit
// @match       http://osekai.net/*
// @match       https://osekai.net/*

// @noframes
// @run-at  	document-start
// ==/UserScript==

(() => {
	'use strict';

	var MEDALS_RARITY_URL = 'https://osekai.net/rankings/api/upload/scripts-rust/down_rarity.php';
	var MedalsRarityArray = []; // This one is sorted by rarity

	document.addEventListener('DOMContentLoaded', () => {
		// Function to override to fix them or something

		reloadosekaiPlus();
	}, { capture: true });


	function reloadosekaiPlus() {

		setInterval(loadIntervalPatches, 250);
		function loadIntervalPatches() {
			giveMedalsRarityRankingCountLoader();
			giveColorsToUsersInRankingsLoader();
			profilesPatchesLoader();
			giveMedalsRarityCountLoader();
		}

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

		async function giveMedalsRarityRankingCountLoader() {
			if (document.URL.startsWith('https://osekai.net/rankings/?ranking=Medals&type=Rarity')) {
				// Want to get medals rarity count first, await it so no race condition
				if (MedalsRarityArray.length == 0) // Only make the request if needed
					MedalsRarityArray = await getMedalsCount();
				giveMedalsRarityRankingCount();
			}
		}

		async function giveMedalsRarityRankingCount() {
			if (document.getElementsByClassName('osekai__pagination_item-active')[0] == null) return; // page isn't finished loading yet
			let len = document.getElementsByClassName('rankings__cascade__content').length;
			for (let i = 0; i < len; i++) {
				let element = document.getElementsByClassName('rankings__cascade__content')[i];
				if (element.innerHTML.startsWith('<p><span>') && element.innerHTML.includes('</span><span class="strong">') && element.innerHTML.endsWith('%</p>')) {
					let index = parseInt(element.parentElement.children[0].children[0].children[0].children[0].children[0].children[1].innerHTML) - 1;
					let count = MedalsRarityArray[index].count;
					let rarity = MedalsRarityArray[index].frequency;
					element.style.setProperty('width', '210px');
					let inhtml = `<p><span>${GetStringRawNonAsync(APP_SHORT, 'bar.medals.rarity.heldBy')} </span><span class="strong">${rarity}</span>% (${count})</p>`;
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
			for (let i = 0; i < sectionsCount; i++) {
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
				let result = MedalsRarityArray.filter((e) => {
					return e.id == medalID;
				});
				let rarityRanking = MedalsRarityArray.map((medal) => medal.id).indexOf(medalID) + 1;
				document.getElementById('strMedalRarity').innerHTML += ` (${result[0].count} #${rarityRanking})`;
			}
		}
	} // Ready ends here

	async function getMedalsCount() {
		return new Promise((resolve) => {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', MEDALS_RARITY_URL, true);
			xhr.onload = () => {
				if (xhr.status === 200) {
					let oResponse = JSON.parse(xhr.responseText);
					resolve(oResponse.sort((a, b) => {
						return a.count - b.count;
					}));
				}
			};
			xhr.send();
		});
	}
})();
