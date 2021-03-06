// API //

async function getCoinsList(limit = 100, offset = 0, sort = "coinranking", order = "desc") {
	if (limit <= 0) {
		return {
			stats: {},
			base: {},
			coins: []
		};
	}

	const response = await fetch(`https://api.coinranking.com/v1/public/coins?limit=${limit}&offset=${offset}&sort=${sort}&order=${order}`);
	const json = await response.json();

	if (json.status !== "success")
		throw JSON.stringify(json);

	return json.data;
}

async function searchCoins(prefix, sort = "coinranking", order = "desc") {
	if (prefix.length === 0) {
		return {
			stats: {},
			base: {},
			coins: []
		};
	}

	const response = await fetch(`https://api.coinranking.com/v1/public/coins?prefix=${prefix}&sort=${sort}&order=${order}`);
	const json = await response.json();

	if (json.status !== "success")
		throw JSON.stringify(json);

	return json.data;
}

async function getCoin(id) {
	const response = await fetch(`https://api.coinranking.com/v1/public/coin/${id}`);
	const json = await response.json();

	if (json.status !== "success")
		throw JSON.stringify(json);

	return json.data;
}

async function searchCoinSymbol(symbol) {
	if (Array.isArray(symbol))
		symbol = symbol.join(",");

	const response = await fetch(`https://api.coinranking.com/v1/public/coins?symbols=${symbol}`);
	const json = await response.json();

	if (json.status !== "success")
		throw JSON.stringify(json);

	return json.data;
}

async function searchCoinID(id) {
	if (Array.isArray(id))
		id = id.join(",");

	const response = await fetch(`https://api.coinranking.com/v1/public/coins?ids=${id}`);
	const json = await response.json();

	if (json.status !== "success")
		throw JSON.stringify(json);

	return json.data;
}

async function getCoinsCount() {
	const list = await getCoinsList(1);
	return list.stats.total;
}

async function getRandomCoins(limit = 3) {
	if (limit <= 0) {
		return {
			stats: {},
			base: {},
			coins: []
		};
	}

	const coinsCount = await getCoinsCount();

	var offsets = [];

	for (var i = 0; i < limit; ++i) {
		var offset;
		do {
			offset = Math.floor(Math.random() * coinsCount);
		} while (offsets.includes(offset));
		offsets.push(offset);
	}

	const promises = offsets.map(offset => getCoinsList(1, offset));
	const responses = await Promise.all(promises);

	var coins = [];
	var base = {};
	var stats = {
		limit: limit,
		offset: null,
		order: null
	};

	for (var i = 0; i < limit; ++i) {
		for (var key in responses[i].base)
			if (!base.hasOwnProperty(key))
				base[key] = responses[i].base[key];

		for (var key in responses[i].stats)
			if (!stats.hasOwnProperty(key))
				stats[key] = responses[i].stats[key];

		coins.push(responses[i].coins[0]);
	}

	return { stats, base, coins };
}

// Favorites //

async function getFavorites() {
	var array = window.localStorage.getItem("Mackee_favorite_coins");
	if (array === null) {
		return {
			stats: {},
			base: {},
			coins: []
		};
	}
	array = JSON.parse(array);

	return await searchCoinID(array);
}

function removeFavorite(coin) {
	var array = window.localStorage.getItem("Mackee_favorite_coins");
	if (array === null) return;
	array = JSON.parse(array);

	const index = array.indexOf(coin.id);
	if (index === - 1) return;
	array.splice(index, 1);

	if (array.length > 0) {
		window.localStorage.setItem("Mackee_favorite_coins", JSON.stringify(array));
	} else {
		window.localStorage.removeItem("Mackee_favorite_coins");
	}
}

function addFavorite(coin) {
	var array = window.localStorage.getItem("Mackee_favorite_coins");
	if (array === null) {
		array = [];
	} else {
		array = JSON.parse(array);
		if (array.includes(coin.id)) return;
	}

	array.push(coin.id);

	window.localStorage.setItem("Mackee_favorite_coins", JSON.stringify(array));
}

// Utils //

function getColorBrightness(hex) {
	if (hex === null)
		hex = "";

	if (hex.startsWith("#"))
		hex = hex.substring(1);

	if (hex.length === 3 || hex.length === 4)
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];

	if (hex.length === 8)
		hex = hex.substring(0, 6);

	if (hex.length !== 6)
		return 0;

	const r = parseInt(hex.substring(0, 2), 16) / 255;
	const g = parseInt(hex.substring(2, 4), 16) / 255;
	const b = parseInt(hex.substring(4, 6), 16) / 255;

	return Math.max(r * r, g, b);
}

function formatChange(change) {
	change = parseFloat(change);
	if (!Number.isFinite(change))
		return "?";
	return (change > 0 ? "+" : change == 0 ? "±" : "-") + Math.abs(change).toFixed(2) + "%";
}

function formatTimeDelta(delta) {
	delta = parseFloat(delta);
	if (!Number.isFinite(delta))
		return "?";

	if (delta < 1000)
		return delta.toFixed() + " ms";
	delta /= 1000;

	if (delta < 60)
		return delta.toFixed() + " secs";
	delta /= 60;

	if (delta < 60)
		return delta.toFixed() + " mins";
	delta /= 60;

	if (delta < 24)
		return delta.toFixed() + " hours";
	delta /= 24;

	if (delta < 7)
		return delta.toFixed() + " days";

	if (delta < 30)
		return (delta / 7).toFixed() + " weeks";

	if (delta < 365)
		return (delta / 30.5).toFixed() + " months";
	delta /= 365;

	return delta.toFixed() + " years";
}

function formatPrice(price, currency = "$") {
	price = parseFloat(price);
	if (!Number.isFinite(price))
		return "?";

	if (price < 1E1)
		return currency + price.toFixed(4);

	if (price < 1E2)
		return currency + price.toFixed(3);

	const multipliers = ["", "k", "M", "B", "T", "Q"];

	for (var i = 0; i < multipliers.length; i++) {
		const multiplier = multipliers[i];

		if (price < 1E3)
			return currency + price.toFixed(2) + multiplier;

		if (price < 1E4)
			return currency + Math.floor(price / 1E3) + "," + (price % 1E3).toFixed(1).padStart(5, "0") + multiplier;

		if (price < 1E5)
			return currency + Math.floor(price / 1E3) + "," + (price % 1E3).toFixed().padStart(3, "0") + multiplier;

		price /= 1E3;
	}

	const power = Math.floor(Math.log10(price));
	price /= Math.pow(10, power);
	return currency + price.toFixed(4) + "E" + (multipliers.length * 3 + power);
}

function formatVolume(volume, currency = "$") {
	volume = parseFloat(volume);
	if (!Number.isFinite(volume))
		return "?";

	const multipliers = ["", "k", "M", "B", "T", "Q"];
	for (var i = 0; i < multipliers.length; i++) {
		const multiplier = multipliers[i];

		if (volume < 1E3)
			return currency + volume.toFixed(2) + multiplier;
		volume /= 1E3;
	}

	const power = Math.floor(Math.log10(volume));
	volume /= Math.pow(10, power);
	return currency + volume.toFixed(2) + "E" + (multipliers.length * 3 + power);
}

// DOM //

function drawCoinGraph(canvas, coin, min_price, max_price) {
	if (coin.history.length <= 1 || max_price <= min_price)
		return;

	const context = canvas.getContext("2d");

	const spacing = canvas.width / (coin.history.length - 1) * 4/5;
	const barWidth = canvas.width / (coin.history.length - 1) - spacing;
	const minBarHeight = 2;

	for (var i = 0; i < coin.history.length - 1; ++i) {
		const offsetX = spacing / 2 + (spacing + barWidth) * i;
		const fromPrice = coin.history[coin.history.length - i - 1];
		const toPrice = coin.history[coin.history.length - i - 2];

		var fromY = (fromPrice - min_price) / (max_price - min_price) * canvas.height;
		var toY = (toPrice - min_price) / (max_price - min_price) * canvas.height;

		if (Math.abs(toY - fromY) < minBarHeight) {
			const midY = (fromY + toY) / 2;
			fromY = midY + (fromY >= toY ? minBarHeight / 2 : -minBarHeight / 2);
			toY = toY + (fromY >= toY ? -minBarHeight / 2 : minBarHeight / 2);
		}

		context.fillStyle = fromY >= toY ? "#41b958" : "#d93939";
		context.fillRect(offsetX, Math.min(fromY, toY), barWidth, Math.abs(toY - fromY));
	}
}

function createCoinCard(coin) {
	/*
	{
		"id": 1,
		"slug": "bitcoin-btc",
		"symbol": "BTC",
		"name": "Bitcoin",
		"description": "Bitcoin is the first decentralized digital currency.",
		"color": "#f7931A",
		"iconType": "vector",
		"iconUrl": "https://cdn.coinranking.com/Sy33Krudb/btc.svg",
		"websiteUrl": "https://bitcoin.org",
		"socials": [
			{
		 		"name": "Bitcoin",
		 		"url": "https://www.reddit.com/r/Bitcoin/",
		 		"type": "reddit"
			}
		],
		"confirmedSupply": true,
		"type": "coin",
		"volume": 6818750000,
		"marketCap": 159393904304,
		"price": "9370.9993109108",
		"circulatingSupply": 17009275,
		"totalSupply": 21000000,
		"firstSeen": 1330214400000,
		"change": -0.52,
		"rank": 1,
		"numberOfMarkets": 9800,
		"numberOfExchanges": 190,
		"history": [
			"9515.0454185372",
			"9540.1812284677",
			"9554.2212643043",
			"9593.571539283",
			"9592.8596962985",
			"9562.5310295967",
			"9556.7860427046",
			"9388.823394515",
			"9335.3004209165",
			"9329.4331700521",
			"9370.9993109108"
		],
		"allTimeHigh": {
			"price": "19500.471361532",
			"timestamp": 1513555200000
		},
		"penalty": false
	}
	*/

	const element = document.createElement("div");

	const white = getColorBrightness(coin.color) <= 160/255;
	element.className = "coin coin-" + (white ? "white" : "black");
	element.style.color = coin.color !== null ? coin.color : "black";

	var min_price = coin.price, max_price = coin.price;
	for (var i = 0; i < coin.history.length; ++i) {
		min_price = Math.min(min_price, coin.history[i]);
		max_price = Math.max(max_price, coin.history[i]);
	}

	const top = document.createElement("div");
	top.className = "coin-top";

	const iconContainer = document.createElement("div");
	iconContainer.className = "coin-icon-container";

	const icon = document.createElement("div");
	icon.className = "coin-icon";
	icon.style.backgroundImage = `url("${coin.iconUrl.replace("\\", "\\\\").replace("\"", "\\\"")}")`;
	iconContainer.appendChild(icon);

	top.appendChild(iconContainer);

	const title = document.createElement("h1");
	title.className = "coin-title";
	title.innerText = coin.name.trim() !== coin.symbol ? coin.name.trim() + " – " + coin.symbol : coin.name;
	top.appendChild(title);

	element.appendChild(top);

	const graph = document.createElement("div");
	graph.className = "coin-graph";

	const axis = document.createElement("div");
	axis.className = "coin-axis";

	const max = document.createElement("div");
	max.className = "coin-max";
	max.innerText = formatPrice(max_price);
	axis.appendChild(max);

	const min = document.createElement("div");
	min.className = "coin-min";
	min.innerText = formatPrice(min_price);
	axis.appendChild(min);

	graph.appendChild(axis);

	const canvas = document.createElement("canvas");
	canvas.className = "coin-canvas";
	canvas.height = 75;
	canvas.width = 320;
	drawCoinGraph(canvas, coin, min_price, max_price);
	graph.appendChild(canvas);

	const variation = document.createElement("div");
	variation.className = "coin-variation";

	variation.appendChild(document.createTextNode("Current:"));

	const price = document.createElement("div");
	price.className = "coin-price";
	price.innerText = formatPrice(coin.price);
	variation.appendChild(price);

	variation.appendChild(document.createTextNode("24h var.:"));

	const change = document.createElement("div");
	change.className = "coin-change";
	change.innerText = formatChange(coin.change);
	change.style.color = coin.change > 0 ? "#41b958" : coin.change < 0 ? "#d93939" : "";
	variation.appendChild(change);

	graph.appendChild(variation);

	element.appendChild(graph);

	const bottom = document.createElement("div");
	bottom.className = "coin-bottom";

	const rank = document.createElement("p");
	rank.className = "coin-rank";
	rank.innerText = "#" + coin.rank;
	bottom.appendChild(rank);

	const labels = document.createElement("p");
	labels.className = "coin-labels";
	labels.innerText = "24h volume\nAll-time high\nCoin age";
	bottom.appendChild(labels);

	const values = document.createElement("p");
	values.className = "coin-values";
	values.innerText = `${formatVolume(coin.volume)}\n${formatPrice(coin.allTimeHigh.price)}\n${formatTimeDelta(new Date().getTime() - coin.firstSeen)}`;
	bottom.appendChild(values);

	const socials = document.createElement("div");
	socials.className = "coin-socials";

	if (coin.websiteUrl !== null) {
		const website = document.createElement("a");
		website.className = "coin-link";
		website.href = coin.websiteUrl;
		website.target = "_blank";

		const websiteIcon = document.createElement("i");
		websiteIcon.className = "fa fa-globe";
		website.appendChild(websiteIcon);

		socials.appendChild(website);
	}

	for (var i = 0; i < coin.socials.length; ++i) {
		const social = coin.socials[i];

		const link = document.createElement("a");
		link.className = "coin-link";
		link.href = social.url;
		link.target = "_blank";
		link.title = social.name;

		switch(social.type) {
		case "twitter":
		case "discord":
		case "youtube":
		case "instagram":
		case "telegram":
		case "reddit":
		case "medium":
		case "facebook":
		case "github":
			const icon = document.createElement("i");
			icon.className = "fab fa-" + social.type;
			link.appendChild(icon);
			break;

		case "bitcointalk":
			const bitcoinIcon = document.createElement("i");
			bitcoinIcon.className = "fab fa-bitcoin";
			link.appendChild(bitcoinIcon);
			break;

		default:
			continue;
		}

		socials.appendChild(link);
	}
	bottom.appendChild(socials);

	element.appendChild(bottom);

	return element;
}

function fillCoins(element, coins) {
	for (var i in coins) {
		const coin = coins[i];
		if (coin === null) continue;
		element.appendChild(createCoinCard(coin));
	}
}
