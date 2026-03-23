// UI切り替え用
const loading = document.querySelector<HTMLDivElement>('#loading');
const error = document.querySelector<HTMLDivElement>('#error');
const empty = document.querySelector<HTMLDivElement>('#empty');

function showElement(element: HTMLElement): void {
  element.style.display = 'block';
}
function hideElement(element: HTMLElement): void {
  element.style.display = 'none';
}

//都市selectForm表示用
const weatherForm = document.querySelector<HTMLFormElement>('#weather-form');
const citySelect = document.querySelector<HTMLSelectElement>('#city-select');
if (!citySelect) {
  throw new Error('city-selectが存在しない');
}
const resultContainer = document.querySelector<HTMLDivElement>('#result-container');

// select要素を取得する関数
async function loadCities(): Promise<void> {
  try {
    const response = await fetch('./primary_area.xml');

    if (!response.ok) {
      throw new Error(`HTTPエラー： ${response.status}`); //404などの時catchへ投げる
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');

    const parserError = xml.querySelector('parsererror');
    if (parserError) {
      throw new Error('XMLの解析に失敗しました。');
    }

    const prefs = xml.querySelectorAll('pref');
    if (prefs.length === 0) {
      throw new Error('都市情報が見つかりませんでした。');
    } //XML仕様変更APIレスポンス形式変更などの時用

    if (!citySelect) return;
    const select = citySelect;

    prefs.forEach((pref) => {
      const firstCity = pref.querySelector('city');
      if (!firstCity) return;

      const id = firstCity.getAttribute('id');
      const title = firstCity.getAttribute('title');
      if (!id || !title) return;

      const option = document.createElement('option');
      option.value = id;
      option.textContent = title;

      select.appendChild(option);
    });
  } catch (e) {
    if (!error) return;

    showElement(error);

    if (e instanceof Error) {
      error.textContent = e.message;
    } else {
      error.textContent = '不明なエラーが発生しました';
    }
    console.error(e);
  }
}
void loadCities();

//天気予報APIのデータ型
interface Forecast {
  date: string;
  telop: string;
  image: {
    url: string;
  };
}
interface WeatherResponse {
  title: string;
  description: {
    bodyText: string;
  };
  forecasts: Forecast[];
}

//型ガード
function isForecast(data: unknown): data is Forecast {
  if (typeof data !== 'object' || data === null) return false;

  if (!('date' in data) || !('telop' in data) || !('image' in data)) return false;

  const d = data as {
    date: unknown;
    telop: unknown;
    image: unknown;
  };

  if (typeof d.date !== 'string') return false;
  if (typeof d.telop !== 'string') return false;
  if (typeof d.image !== 'object' || d.image === null) return false;
  if (!('url' in d.image)) return false;

  const image = d.image as { url: unknown };

  return typeof image.url === 'string';
}

function isWeatherResponse(data: unknown): data is WeatherResponse {
  if (typeof data !== 'object' || data === null || !('title' in data) || !('forecasts' in data))
    return false;

  const d = data as {
    title: unknown;
    forecasts: unknown;
  };
  return typeof d.title === 'string' && Array.isArray(d.forecasts) && d.forecasts.every(isForecast);
}

//汎用fetch
async function fetchJson<T>(url: string, validator: (data: unknown) => data is T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error: ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!validator(data)) {
    throw new Error('データ形式が不正です');
  }
  return data;
}

// APIから天気情報を取得して表示する関数
async function fetchWeather(cityCode: string): Promise<void> {
  // ローディング状態
  if (!loading || !resultContainer || !error || !empty) return;

  showElement(loading);
  hideElement(resultContainer);
  hideElement(error);
  hideElement(empty);

  const apiUrl = `https://weather.tsukumijima.net/api/forecast?city=${cityCode}`;

  resultContainer.innerHTML = ''; // 前回表示分削除

  try {
    const data = await fetchJson(apiUrl, isWeatherResponse);

    // データ表示
    hideElement(loading);

    if (data.forecasts.length === 0) {
      showElement(empty); //地域コードのエラー時
      return;
    }
    showElement(resultContainer);

    const weatherCard = createWeatherCard(data);

    const forecastWrapper = document.createElement('div');
    forecastWrapper.classList.add('forecast-wrapper');

    weatherCard.appendChild(forecastWrapper);
    data.forecasts.forEach((item: Forecast) => {
      forecastWrapper.append(createForecastItem(item));
    });

  } catch (e) {
    hideElement(loading);
    showElement(error);
    console.error('fetchの失敗', e);
  }
}

if (!weatherForm) {
  throw new Error('weatherFormがないのだが・・');
}

weatherForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!citySelect) return;
  const cityCode = citySelect.value;

  if (!cityCode) {
    alert('都市を選択してね');
    return;
  }

  void fetchWeather(cityCode);
});

function createWeatherCard(data: WeatherResponse): HTMLElement {
  const weatherCard = document.createElement('div');
  weatherCard.classList.add('weather-card');

  const cityName = document.createElement('h2');
  cityName.textContent = data.title;

  const forecast = document.createElement('p');
  forecast.textContent = data.description.bodyText;

  weatherCard.appendChild(cityName);
  weatherCard.appendChild(forecast);

  return weatherCard;
}

function createForecastItem(item: Forecast): HTMLElement {
  const forecastItem = document.createElement('div');
  forecastItem.classList.add('forecast-item');

  const date = document.createElement('p');
  date.textContent = item.date;

  const image = document.createElement('img');
  image.src = item.image.url;

  const telop = document.createElement('p');
  telop.textContent = item.telop;

  forecastItem.appendChild(date);
  forecastItem.appendChild(image);
  forecastItem.appendChild(telop);

  return forecastItem;
}