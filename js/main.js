var Statistics = {
	u_amount : 0,
	c_amount : 0,
	p_amount : 0,
	markers : new Array()
};

var ZOOM_LEVEL = 10;
var AppState = {
	map : null,
	currentConfigKey : "1"
};

var AppInitialized = false;

function initMapApp () {
	if (AppInitialized) {
		return;
	}
	if (document.readyState !== "complete" || !window.BMap) {
		return;
	}
	AppInitialized = true;

	applyConfig(AppState.currentConfigKey);
	initMapTitle();
	initAboutModal();

	var map = new BMap.Map("container");
	AppState.map = map;
	map.setMapStyle({style : MAP_STYLE});
	map.addEventListener("zoomend", function () {
		hideOverlayMarkers(map);
	});

	addControls(map);
	addMarks(map);

	initStatisticsModal();
	initSearch(map);
	initConfigSwitch(map);

	var zoom = 5, point = new BMap.Point(104.072749, 30.440276);
	if (window.innerWidth < 480) {
		zoom = 6;
		point = new BMap.Point(104.072749, 30.440276);
	}
	map.centerAndZoom(point, zoom);
	map.enableScrollWheelZoom(true);
}

window.initMapApp = initMapApp;
window.addEventListener("load", initMapApp);

function initMapTitle(argument) {
	document.title = MAP_TITLE;

	var navbar = $("#navbar");
	$("#container").height($(window).height() - navbar.height());

	$("#map_title").text(MAP_TITLE);
}

function resetStatistics () {
	Statistics.u_amount = 0;
	Statistics.c_amount = 0;
	Statistics.p_amount = 0;
	Statistics.markers = [];
}

function clearMarkers (map) {
	for (var i = 0, l = Statistics.markers.length; i < l; i++) {
		map.removeOverlay(Statistics.markers[i]);
	}
	Statistics.markers = [];
}

function initSearch (map) {
	$("#navbar-right").on("submit", function (event) {
		event.preventDefault();
		searchAndLocate(map, $("#txtSearch").val());
	});
}

function searchAndLocate (map, keyword) {
	var query = $.trim(keyword || "");
	if (!query) {
		return;
	}

	var lowerQuery = query.toLowerCase();
	var list = Statistics.markers;
	var target = null;

	for (var i = 0, l = list.length; i < l; i++) {
		var marker = list[i];
		var haystack = (marker.m_city + " " + marker.m_university + " " + marker.m_names).toLowerCase();
		if (haystack.indexOf(lowerQuery) >= 0) {
			target = marker;
			break;
		}
	}

	if (!target) {
		alert("未找到匹配项：" + query);
		return;
	}

	var point = target.getPosition();
	map.centerAndZoom(point, Math.max(ZOOM_LEVEL, map.getZoom()));
	showMarkerInfo(map, target, point);
}

function initConfigSwitch (map) {
	var selector = ".floating-checkbox-container input[type='checkbox']";
	$(selector).on("change", function () {
		var key = $(this).data("config-key") + "";

		if (!this.checked) {
			this.checked = true;
			return;
		}

		$(selector).not(this).prop("checked", false);
		switchConfig(map, key);
	});
}

function switchConfig (map, key) {
	var config = getClassConfig(key);
	if (!config) {
		alert("\"" + key + "班\"配置尚未添加。请先在 config.js 的 CLASS_CONFIGS 中补充。");
		$(".floating-checkbox-container input[type='checkbox']").each(function () {
			var itemKey = ($(this).data("config-key") + "");
			this.checked = (itemKey === AppState.currentConfigKey);
		});
		return;
	}

	AppState.currentConfigKey = key;
	applyConfig(key);
	map.setMapStyle({style : MAP_STYLE});
	clearMarkers(map);
	addMarks(map);
	initMapTitle();
	initAboutModal();
	initStatisticsModal();
}

function getClassConfig (key) {
	if (!window.CLASS_CONFIGS) {
		return null;
	}
	return window.CLASS_CONFIGS[key] || null;
}

function applyConfig (key) {
	var config = getClassConfig(key);
	if (!config) {
		return false;
	}

	MAP_STYLE = config.MAP_STYLE || MAP_STYLE;
	DATA = config.DATA || {};
	SPEC_POS = config.SPEC_POS || {};
	MAP_TITLE = config.MAP_TITLE || MAP_TITLE;
	ABOUT = config.ABOUT || {};

	return true;
}

function initAboutModal () {
	var tag = $("#about_modal_body");
	var content = "";

	for (var k in ABOUT) {
		content += "<h4>" + k + "</h4>";

		var list = ABOUT[k];

		for (var i = 0, l = list.length; i < l; i++) {
			content += "<p>" + list[i] + "</p>";
		}

		content += "</br>";
	}

	tag.html(content);
}

function initStatisticsModal () {
	var tag = $("#statistics_modal_body");
	var content = "";

	content += "<h4>大学总数</h4>"
	content += "<p>" + Statistics.u_amount + "</p>";

	content += "<br />";

	content += "<h4>城市总数</h4>"
	content += "<p>" + Statistics.c_amount + "</p>";

	content += "<br />";

	content += "<h4>学生总数</h4>"
	content += "<p>" + Statistics.p_amount + "</p>";

	tag.html(content);
}

function addControls(map) {
	var navigation = new BMap.NavigationControl({anchor : BMAP_ANCHOR_BOTTOM_RIGHT});
	map.addControl(navigation);
}

function addMarks (map) {
	resetStatistics();
	var myGeo = new BMap.Geocoder();

	for (var city in DATA) {
		var universityList = DATA[city];

		var c_nameStr = "<div style='max-height: 300px; overflow: auto;'>";

		/** Get students in the same city */
		for (var university in universityList) {
			var nameList = universityList[university];

			c_nameStr += "<br /><b style='font-size: 20px;'>" + university + "</b><br />";

			Statistics.u_amount++;

			for (var i = 0, l = nameList.length; i < l; i++) {
				var n = nameList[i];

				c_nameStr += n + " ";

				Statistics.p_amount++;
			}

			c_nameStr += "<br />";
		}

		c_nameStr += "</div>";

		/** Get students in the same university */
		for (var university in universityList) {
			var nameList = universityList[university];
			var u_nameStr = "";

			for (var i = 0, l = nameList.length; i < l; i++) {
				var n = nameList[i];

				u_nameStr += n + " ";
			}

			createMarker(myGeo, map, city, university, c_nameStr, u_nameStr);
		}

		Statistics.c_amount++;
	}
}

function createMarker (geo, map, city, university, c_names, u_names) {
	function create (point){
		if (point) {
			var marker = new BMap.Marker(point,{
				icon: new BMap.Symbol(BMap_Symbol_SHAPE_POINT, {
					scale: 1,
					fillColor: "orangered",
					fillOpacity: 0.8
				})
			});
			marker.m_city = city;
			marker.m_university = university;
			marker.m_names = u_names;
			marker.m_cityInfo = c_names;
			marker.m_universityInfo = u_names;
			map.addOverlay(marker);
			marker.setAnimation(BMAP_ANIMATION_DROP);

			marker.addEventListener("click", function () {
				showMarkerInfo(map, marker, marker.getPosition());
			});

			Statistics.markers.push(marker);

			hideOverlayMarkers(map);
		}
	}

	if (SPEC_POS[university]) {
		var p = SPEC_POS[university];

		create(new BMap.Point(p[0], p[1]));
	} else {
		geo.getPoint(university, create, city);
	}
}

function showMarkerInfo (map, marker, point) {
	var zoom = map.getZoom();
	var opts = {
		width : 200,
		title : zoom < ZOOM_LEVEL ? marker.m_city : marker.m_university,
		enableMessage : false
	};

	var infoWindow = new BMap.InfoWindow(zoom < ZOOM_LEVEL ? marker.m_cityInfo : marker.m_universityInfo, opts);
	map.openInfoWindow(infoWindow, point);
}

function hideOverlayMarkers (map) {
	var zoom = map.getZoom(), buff = new Array(), list = Statistics.markers, l = list.length;

	if (zoom < ZOOM_LEVEL) {
		for (var i = 0; i < l; i++) {
			var m = list[i], city = m.m_city;

			if (buff.indexOf(city) >= 0) {
				m.hide();
			} else {
				m.show();

				buff.push(city);
			}
		}
	} else {
		for (var i = 0; i < l; i++) {
			var m = list[i];

			if (!m.isVisible()) {
				m.show();
			}
		}
	}
}
