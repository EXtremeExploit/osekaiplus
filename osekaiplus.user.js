// ==UserScript==
// @name        osekaiplus
// @namespace   https://pedro.moe
// @version     1.8.14
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
	var NeedWaitOnRarityRequest = false;
	var MedalsRarityArray = []; // This one is sorted by rarity

	document.addEventListener('DOMContentLoaded', () => {
		// Function to override to fix them or something

		reloadosekaiPlus();
	}, { capture: true });


	function reloadosekaiPlus() {

		setInterval(loadIntervalPatches, 250);
		function loadIntervalPatches() {
			RankingMedalsRarityCountLoader();
			RankingsUsersColorsLoader();
			profilesPatchesLoader();
			MedalsRarityAndCountLoader();
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

		async function RankingMedalsRarityCountLoader() {
			if (document.URL.startsWith('https://osekai.net/rankings/?ranking=Medals&type=Rarity')) {
				if (NeedWaitOnRarityRequest) return;
				// Want to get medals rarity count first, await it so no race condition
				if (MedalsRarityArray.length == 0) // Only make the request if needed
					MedalsRarityArray = await getMedalsCount();
				RankingMedalsRarityCount();
			}
		}

		async function RankingMedalsRarityCount() {
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

		async function RankingsUsersColorsLoader() {
			if (!document.URL.startsWith('https://osekai.net/rankings/?ranking=Medals&type=Users')) return; // Not in correct place
			if (document.getElementsByClassName('rankings__cascade__content').length == 0) return; // Rankings didnt load yet

			let contents = document.getElementsByClassName('rankings__cascade__content');
			if (contents.childElementCount < 2) return;
			if (contents[1].childElementCount < 1) return;
			if (contents[1].children[0].childElementCount < 2) return;
			if (contents[1].children[0].children[1].style.color != '') return;
			RankingsUsersColors();
		}

		async function RankingsUsersColors() {
			let contentCount = document.getElementsByClassName('rankings__cascade__content').length;
			for (let i = 0; i < contentCount; i++) {
				let content = document.getElementsByClassName('rankings__cascade__content')[i];
				if (content.childElementCount == 1 && content.children[0].outerHTML.startsWith('<p')) {
					let p = content.children[0];
					if (p.childElementCount == 4 && p.children[1].outerHTML.startsWith('<a')) {
						let a = p.children[1];

						a.style.color = 'rgb(var(--maincol))';
						a.style.textDecoration = 'none';
					}
				}
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

		async function MedalsRarityAndCountLoader() {
			if (document.URL.startsWith('https://osekai.net/medals/?')) {
				if (NeedWaitOnRarityRequest) return;
				// Want to get medals rarity count first, await it so no race condition
				if (MedalsRarityArray.length == 0)// Only make the request if needed
					MedalsRarityArray = await getMedalsCount();
				MedalsRarityAndCount();
			}
		}

		function MedalsRarityAndCount() {
			if (document.getElementById('strMedalRarity') && document.getElementById('strMedalRarity').innerHTML.endsWith('%')) {
				let params = new URLSearchParams(window.location.search);
				let medalID = parseInt(colMedals[params.get('medal')].MedalID);
				let result = MedalsRarityArray.find((e) => e.id == medalID);
				let rarityRanking = MedalsRarityArray.map((medal) => medal.id).indexOf(medalID) + 1;
				document.getElementById('strMedalRarity').innerHTML += ` (${result.count} #${rarityRanking})`;
			}
		}
	} // Ready ends here

	async function getMedalsCount() {
		NeedWaitOnRarityRequest = true;
		return new Promise((resolve) => {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', MEDALS_RARITY_URL, true);
			xhr.onload = () => {
				if (xhr.status === 200) {
					let oResponse = JSON.parse(xhr.responseText);
					NeedWaitOnRarityRequest = false;
					resolve(oResponse.sort((a, b) => {
						return a.count - b.count;
					}));
				}
			};
			xhr.send();
		});
	}
})();
