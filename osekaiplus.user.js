// ==UserScript==
// @name        osekaiplus
// @namespace   https://pedro.moe
// @version     1.8.0
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
		if (typeof LoadRecentlyViewed !== 'undefined') LoadRecentlyViewed = LoadRecentlyViewedPatched;
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
				if (MedalsRarityArray.length == 0) // Only make the request if needed
					MedalsRarityArray = await getMedalsCount();
				giveMedalsRarityRankingCount();
			}
		}

		async function giveMedalsRarityRankingCount() {
			if (document.getElementsByClassName('osekai__pagination_item-active')[0] == null) return; // page isn't finished loading yet
			let iteration = getCurrentPage() * 50;
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


	// Patched functions go here, outside the ready scope

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
					html += `
				<div class="profiles__ranking-user" onclick="loadUser(${json[i].visited_id});">
					<img src="https://a.ppy.sh/${json[i].visited_id}" class="profiles__ranking-pfp">
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

	// I can't just change the event listener of the input field, so i have to override the entire thing :skull:
	// This is super scuffed, but its the best i could do
	async function requestMedalsPatched(bInit, strKey, strValue, strUrl) {
		if (bInit) {
			var xhr = createXHR(strUrl);
			xhr.send(strKey + '=' + strValue);

			xhr.onreadystatechange = function () {
				document.getElementById('oMedalSection').innerHTML = '';
				var oResponse = getResponse(xhr);
				let strLastRestriction;
				if (handleUndefined(oResponse)) return;
				Object.keys(oResponse).forEach(function (obj) {
					let imgList = '';
					if (handleUndefined(obj)) return;
					oResponse[obj].forEach(function (innerObj) {
						// console.log(innerObj.Name)
						colMedals[innerObj.Name] = innerObj;
						if (innerObj.Name == 'chromb') return;
						if ((typeof strLastRestriction !== 'undefined' && strLastRestriction !== null) && innerObj.Restriction !== strLastRestriction) imgList += '</div><div class="osekai__divider"></div><div class="medals__grid">';
						imgList += '<div class="medals__grid-medal-container" data-tippy-content="' + innerObj.Name + '">';
						// if date is not null, and it is less than a week ago, it's new!
						// console.log(innerObj);
						if (innerObj.Date != null) {
							let date = new Date(innerObj.Date);
							let now = new Date();
							let diff = now.getTime() - date.getTime();
							// console.log(diff);
							if (diff < 604800000) {
								// console.log("new");
								imgList += '<div class="new-badge">NEW</div>';
							}
						}
						imgList += '<img onload="medalImageLoaded(this)" onclick="changeState(\'' + innerObj.Name.replace(/'/g, '\\\'') + '\')" alt="' + innerObj.Name + '" id="medal_' + innerObj.MedalID + '"  class="medals__grid-medal lazy" src="' + innerObj.Link + '">';
						imgList += '</div>';
						strLastRestriction = innerObj.Restriction;
					});
					strLastRestriction = null;
					oMedalSection.innerHTML += '<section class="osekai__panel"><div class="osekai__panel-header"><p>' + obj + '</p></div><div class="osekai__panel-inner"><div class="medals__grid-container"><div class="medals__grid">' + imgList + '</div></div></div></section>';
				});
				tippy('[data-tippy-content]', {
					appendTo: document.getElementsByClassName('medals__scroller')[0],
					arrow: true,
				});

				if (new URLSearchParams(window.location.search).get('medal') !== null) loadMedal(new URLSearchParams(window.location.search).get('medal'));
			};
		} else {
			// Patched part here :)
			document.getElementById('oMedalSection').innerHTML = '';

			let colMedalsArray = Object.values(colMedals);

			let filteredMedalsArray = colMedalsArray.filter((e) => {
				return e.Name.toLowerCase().includes(strValue.toLowerCase());
			});

			let arr = [];
			for (const [k, v] of Object.entries(filteredMedalsArray)) {
				if (arr[v.Grouping] == null) arr[v.Grouping] = [];
				arr[v.Grouping].push(v);
			}
			let strLastRestriction;
			Object.keys(arr).forEach((obj) => {
				let imgList = '';
				arr[obj].forEach((innerObj) => {
					// console.log(innerObj.Name)
					arr[innerObj.Name] = innerObj;
					if (innerObj.Name == 'chromb') return;
					if ((typeof strLastRestriction !== 'undefined' && strLastRestriction !== null) && innerObj.Restriction !== strLastRestriction) imgList += '</div><div class="osekai__divider"></div><div class="medals__grid">';
					imgList += '<div class="medals__grid-medal-container" data-tippy-content="' + innerObj.Name + '">';
					if (innerObj.Date != null) { // It has a date!, check if its less than a week old
						let date = new Date(innerObj.Date);
						let now = new Date();
						let diff = now.getTime() - date.getTime();
						if (diff < 604800000) {
							// IT IS!, add the new badge 8)
							imgList += '<div class="new-badge">NEW</div>';
						}
					}
					imgList += '<img onload="medalImageLoaded(this)" onclick="changeState(\'' + innerObj.Name.replace(/'/g, '\\\'') + '\')" alt="' + innerObj.Name + '" id="medal_' + innerObj.MedalID + '"  class="medals__grid-medal lazy" src="' + innerObj.Link + '">';
					imgList += '</div>';
					strLastRestriction = innerObj.Restriction;
				});
				strLastRestriction = null;
				oMedalSection.innerHTML += '<section class="osekai__panel"><div class="osekai__panel-header"><p>' + obj + '</p></div><div class="osekai__panel-inner"><div class="medals__grid-container"><div class="medals__grid">' + imgList + '</div></div></div></section>';
			});
		}
	}
})();
