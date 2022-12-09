// ==UserScript==
// @name        osekaiplus
// @namespace   https://pedro.moe
// @version     1.8.8
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
	var MedalsAchievedFilterArray = [];

	document.addEventListener('DOMContentLoaded', () => {
		// Function to override to fix them or something
		if (typeof filterAchieved !== 'undefined') filterAchieved = filterAchievedPatched;
		if (typeof requestMedals !== 'undefined') requestMedals = requestMedalsPatched;

		reloadosekaiPlus();
	}, { capture: true });


	function reloadosekaiPlus() {

		setInterval(loadIntervalPatches, 250);
		function loadIntervalPatches() {
			giveMedalsRarityRankingCountLoader();
			giveColorsToUsersInRankingsLoader();
			profilesPatchesLoader();
			giveMedalsRarityCountLoader();
			betterMedalsFilteringLoader();
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



		function txtMedalSearchEventListener() {
			filterAchieved(document.getElementById('styled-checkbox-1').checked);
		}

		async function betterMedalsFilteringLoader() {
			if (document.URL.startsWith('https://osekai.net/medals/')) {
				document.getElementById('txtMedalSearch').removeEventListener('input', txtMedalSearchEventListener);
				document.getElementById('txtMedalSearch').addEventListener('input', txtMedalSearchEventListener);
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
	async function getMedalsFilterArray() {
		return new Promise((resolve) => {
			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://osekai.net/medals/api/filters.php', true);
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
			xhr.onload = () => {
				if (xhr.status === 200) {
					let oResponse = JSON.parse(xhr.responseText);
					resolve(oResponse);
				}
			};
			xhr.send('strSearch=');
		});
	}

	async function initColMedals() {
		return new Promise((resolve) => {
			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://osekai.net/medals/api/medals.php', true);
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
			xhr.onreadystatechange = function () {
				var oResponse = getResponse(xhr);
				if (handleUndefined(oResponse)) return;
				Object.keys(oResponse).forEach(function (obj) {
					if (handleUndefined(obj)) return;
					oResponse[obj].forEach(function (innerObj) {
						colMedals[innerObj.Name] = innerObj;
					});
				});
				resolve();
			};
			xhr.send('strSearch=');
		});
	}

	// Patched functions go here, outside the ready scope
	async function filterAchievedPatched(on) {
		if (MedalsAchievedFilterArray.length == 0) {
			MedalsAchievedFilterArray = await getMedalsFilterArray();
		}

		if (on) {
			for (let i = 0; i < MedalsAchievedFilterArray.length; i++) {
				let medalid = MedalsAchievedFilterArray[i];
				if (document.getElementById('medal_' + medalid)) {
					document.getElementById('medal_' + medalid).classList.add('medals__medal-filtered');
				}
			}
		} else {
			let filteredMedals = document.getElementsByClassName('medals__medal-filtered').length;
			for (let i = 0; i < filteredMedals; i++) {
				document.getElementsByClassName('medals__medal-filtered')[0].classList.remove('medals__medal-filtered');
			}

		}
	}

	async function requestMedalsPatched(bInit, strKey, strValue) {
		if (bInit || Object.values(colMedals).length == 0)  // Init the colMedals object
			await initColMedals();

		let filteredMedalsArrayByGroup = [];
		for (let v of Object.values(colMedals)) {
			// Match Name, Solution, Description, Instructions and medal id
			if (v.Name.toLowerCase().includes(strValue.toLowerCase()) ||
				v.Solution?.toLowerCase().includes(strValue.toLowerCase()) ||
				v.Description?.toLowerCase().includes(strValue.toLowerCase()) ||
				v.Instructions?.toLowerCase().includes(strValue.toLowerCase()) ||
				v.MedalID == parseInt(strValue)) {
				if (filteredMedalsArrayByGroup[v.Grouping] == null) filteredMedalsArrayByGroup[v.Grouping] = [];
				filteredMedalsArrayByGroup[v.Grouping].push(v);
			}
		}

		setTimeout(() => {
			document.getElementById('oMedalSection').textContent = '';
			Object.keys(filteredMedalsArrayByGroup).forEach((group) => {
				let strLastRestriction = null;
				let grids = [];
				let grid_i = 0;
				filteredMedalsArrayByGroup[group].forEach((medal) => {
					if (medal.Restriction !== strLastRestriction && strLastRestriction !== null)
						grid_i++;
					strLastRestriction = medal.Restriction;

					let medalDiv = document.createElement('div');
					medalDiv.classList.add('medals__grid-medal-container');

					if (medal.Date != null) { // It has a date!, check if its less than a week old
						let date = new Date(medal.Date);
						let now = new Date();
						let diff = now.getTime() - date.getTime();
						if (diff < 604800000) {
							// IT IS!, add the new badge 8)
							let newBadge = document.createElement('div');
							newBadge.classList.add('new-badge');
							newBadge.textContent = 'NEW';
							medalDiv.appendChild(newBadge);
						}
					}
					let medalImg = document.createElement('img');
					medalImg.setAttribute('data-tippy-content', medal.Name);
					medalImg.classList.add('medals__grid-medal');
					medalImg.classList.add('lazy');
					medalImg.src = medal.Link;
					medalImg.alt = medal.Name;
					medalImg.id = `medal_${medal.MedalID}`;
					medalImg.onload = medalImageLoaded(medalImg);
					medalImg.onclick = () => {
						changeState(medal.Name);
					};

					medalDiv.appendChild(medalImg);

					if (grids[grid_i] == undefined)
						grids[grid_i] = [];
					grids[grid_i].push(medalDiv);
				});
				let section = document.createElement('section');
				section.classList.add('osekai__panel');

				// Header
				let sectionHeader = document.createElement('div');
				sectionHeader.classList.add('osekai__panel-header');

				let sectionHeaderP = document.createElement('p');
				sectionHeaderP.textContent = group;

				sectionHeader.appendChild(sectionHeaderP);
				section.appendChild(sectionHeader);
				// Header end

				// Medal grid
				let panelInner = document.createElement('div');
				panelInner.classList.add('osekai__panel-inner');

				let panelMedalsContainer = document.createElement('div');
				panelMedalsContainer.classList.add('medals__grid-container');

				for (let i = 0; i < grids.length; i++) {
					let medalsContainer = document.createElement('div');
					medalsContainer.classList.add('medals__grid');
					for (let j = 0; j < grids[i].length; j++)
						medalsContainer.appendChild(grids[i][j]);
					panelMedalsContainer.appendChild(medalsContainer);

					if (grids[i + 1] != undefined && grids[i + 1] != null) {
						let dividerDiv = document.createElement('div');
						dividerDiv.classList.add('osekai__divider');
						panelMedalsContainer.appendChild(dividerDiv);
					}
				}

				panelInner.appendChild(panelMedalsContainer);
				section.appendChild(panelInner);
				// Medal grid end

				document.getElementById('oMedalSection').appendChild(section);
			});
			setTimeout(() => {
				tippy('[data-tippy-content]', {
					appendTo: document.getElementsByClassName('medals__scroller')[0],
					arrow: true
				});
			}, 10);
		}, 10);

		if (bInit && new URLSearchParams(window.location.search).get('medal') !== null) loadMedal(new URLSearchParams(window.location.search).get('medal'));
	}
})();
