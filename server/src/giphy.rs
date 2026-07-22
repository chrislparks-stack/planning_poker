use std::{collections::HashMap, env, time::Duration};

use actix_web::{HttpResponse, http::StatusCode, web};
use futures_util::StreamExt;
use reqwest::{Client, Url, header};

const GIPHY_API_BASE: &str = "https://api.giphy.com/v1/gifs";
const ALLOWED_API_PATHS: [&str; 4] = ["categories", "search", "search/tags", "trending"];

fn api_key() -> Option<String> {
    env::var("GIPHY_KEY")
        .or_else(|_| env::var("VITE_GIPHY_KEY"))
        .ok()
        .filter(|key| !key.trim().is_empty())
}

fn error_response(status: StatusCode, message: &str) -> HttpResponse {
    HttpResponse::build(status).json(serde_json::json!({ "error": message }))
}

pub async fn api(
    client: web::Data<Client>,
    path: web::Path<String>,
    query: web::Query<HashMap<String, String>>,
) -> HttpResponse {
    let api_path = path.into_inner();
    if !ALLOWED_API_PATHS.contains(&api_path.as_str()) {
        return error_response(StatusCode::NOT_FOUND, "Unknown GIPHY endpoint");
    }

    let Some(key) = api_key() else {
        return error_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "GIF search is not configured",
        );
    };

    let Ok(mut url) = Url::parse(&format!("{GIPHY_API_BASE}/{api_path}")) else {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, "Invalid upstream URL");
    };

    {
        let mut params = url.query_pairs_mut();
        params.append_pair("api_key", &key);

        if let Some(search) = query.get("q") {
            params.append_pair("q", search);
        }

        let limit = query
            .get("limit")
            .and_then(|value| value.parse::<u8>().ok())
            .unwrap_or(12)
            .clamp(1, 25)
            .to_string();
        params.append_pair("limit", &limit);
    }

    match client
        .get(url)
        .timeout(Duration::from_secs(10))
        .send()
        .await
    {
        Ok(response) => {
            let status =
                StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            let content_type = response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .unwrap_or("application/json")
                .to_string();

            match response.bytes().await {
                Ok(body) => HttpResponse::build(status)
                    .content_type(content_type)
                    .body(body),
                Err(_) => error_response(StatusCode::BAD_GATEWAY, "GIPHY response failed"),
            }
        }
        Err(_) => error_response(StatusCode::BAD_GATEWAY, "GIPHY is unavailable"),
    }
}

pub async fn image(
    client: web::Data<Client>,
    query: web::Query<HashMap<String, String>>,
) -> HttpResponse {
    let Some(source) = query.get("url") else {
        return error_response(StatusCode::BAD_REQUEST, "Missing image URL");
    };

    let Ok(url) = Url::parse(source) else {
        return error_response(StatusCode::BAD_REQUEST, "Invalid image URL");
    };

    let is_giphy_host = url
        .host_str()
        .is_some_and(|host| host == "giphy.com" || host.ends_with(".giphy.com"));

    if url.scheme() != "https" || !is_giphy_host {
        return error_response(StatusCode::BAD_REQUEST, "Unsupported image host");
    }

    match client
        .get(url)
        .timeout(Duration::from_secs(20))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            let content_type = response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .unwrap_or("image/gif")
                .to_string();
            let content_length = response.content_length();
            let stream = response
                .bytes_stream()
                .map(|chunk| chunk.map_err(actix_web::error::ErrorBadGateway));

            let mut builder = HttpResponse::Ok();
            builder.content_type(content_type);
            builder.insert_header((header::CACHE_CONTROL.as_str(), "public, max-age=86400"));
            if let Some(length) = content_length {
                builder.insert_header((header::CONTENT_LENGTH.as_str(), length.to_string()));
            }
            builder.streaming(stream)
        }
        Ok(response) => {
            let status =
                StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
            error_response(status, "GIPHY image failed")
        }
        Err(_) => error_response(StatusCode::BAD_GATEWAY, "GIPHY image is unavailable"),
    }
}
