// UI切り替え用
const loading = document.querySelector("#loading");
const error = document.querySelector("#error");
const empty = document.querySelector("#empty");

function showElement(element) {
    element.style.display = "block";
}
function hideElement(element) {
    element.style.display = "none";
}
// UI切り替え用

const weatherForm = document.querySelector("#weather-form");
const citySelect = document.querySelector("#city-select");
const resultContainer = document.querySelector("#result-container");

// select要素を取得する関数
async function loadCities() {
    try {
        const response = await fetch("./primary_area.xml");

        if (!response.ok) {
            throw new Error(`HTTPエラー： ${response.status}`);//404などの時catchへ投げる
        }

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "application/xml");

        // console.log("XMLデータ:", xml);
        const parserError = xml.querySelector("parsererror");
        if (parserError) {
            throw new Error("XMLの解析に失敗しました。");
        }

        const prefs = xml.querySelectorAll("pref");

        if (prefs.length === 0) {
            throw new Error("都市情報が見つかりませんでした。");
        }//XML仕様変更APIレスポンス形式変更などの時用

        prefs.forEach((pref) => {
            const firstCity = pref.querySelector("city");

            const option = document.createElement("option");
            option.value = firstCity.getAttribute("id");
            option.textContent = firstCity.getAttribute("title");

            citySelect.appendChild(option);
        });
    } catch (e) {
        showElement(error);
        error.textContent = `${e.message}`;
    }
}

loadCities();

// APIから天気情報を取得して表示する関数
async function fetchWeather(cityCode) {
    // ローディング状態
    showElement(loading);
    hideElement(resultContainer);
    hideElement(error);
    hideElement(empty);

    const apiUrl = `https://weather.tsukumijima.net/api/forecast?city=${cityCode}`;

    // console.log("cityCode:", cityCode);
    // console.log(apiUrl);
    
    resultContainer.innerHTML = ""; // ← 前回分削除

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        // console.log(data);
        // console.log(data.length);

        // データ表示
        hideElement(loading);

        if (!data.forecasts || data.forecasts.length === 0) {
            showElement(empty); //地域コードのエラー時
        } else {
            showElement(resultContainer);

            const weatherCard = document.createElement("div");
            weatherCard.classList.add("weather-card");

            const cityName = document.createElement("h2");
            cityName.textContent = data.title;

            const forcast = document.createElement("p");
            forcast.textContent = data.description.bodyText;

            resultContainer.appendChild(weatherCard);
            weatherCard.appendChild(cityName);
            weatherCard.appendChild(forcast);

            const forecastWrapper = document.createElement("div");
            forecastWrapper.classList.add("forecast-wrapper");

            weatherCard.appendChild(forecastWrapper);

            data.forecasts.forEach((item) => {
                
                const forecastItem = document.createElement("div");
                forecastItem.classList.add("forecast-item");

                const date = document.createElement("p");
                date.textContent = item.date;

                const image = document.createElement("img");
                image.src = item.image.url;

                const telop = document.createElement("p");
                telop.textContent = item.telop;

                forecastItem.appendChild(date);
                forecastItem.appendChild(image);
                forecastItem.appendChild(telop);

                forecastWrapper.appendChild(forecastItem);
            });
        }
    } catch (e) {
        hideElement(loading);
        showElement(error);
        console.error("fetchの失敗", e);
    }
}

weatherForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const cityCode = citySelect.value;

    if (!cityCode) {
        alert("都市を選択してね");
        return;
    }
    fetchWeather(cityCode);
});
