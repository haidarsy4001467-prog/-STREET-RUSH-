/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "4f4de272b345b2d8fa70e41191e6cd53"
  }, {
    "url": "pwa-512x512.png",
    "revision": "97b7058e5a149f98d0ffce3a463473d1"
  }, {
    "url": "pwa-192x192.png",
    "revision": "14acc925012908a910837304ee2163ea"
  }, {
    "url": "index.html",
    "revision": "30fa52c30909d946b473145a1482fe88"
  }, {
    "url": "favicon.ico",
    "revision": "e5ba23e02846e6790151efe983ea28e7"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5cf7d67421b49283ce6e6cb2160dae00"
  }, {
    "url": "src/assets/images/street_rush_icon_1795538579191.jpg",
    "revision": "761edc5afeb17dfaeffed3d292cdc704"
  }, {
    "url": "src/assets/images/street_rush_hero_1795538579550.jpg",
    "revision": "e12a984d616f9352791565926580b9c0"
  }, {
    "url": "assets/index-vVoO6-d-.js",
    "revision": null
  }, {
    "url": "assets/index-CX5Fo22a.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5cf7d67421b49283ce6e6cb2160dae00"
  }, {
    "url": "favicon.ico",
    "revision": "e5ba23e02846e6790151efe983ea28e7"
  }, {
    "url": "pwa-192x192.png",
    "revision": "14acc925012908a910837304ee2163ea"
  }, {
    "url": "pwa-512x512.png",
    "revision": "97b7058e5a149f98d0ffce3a463473d1"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "4f4de272b345b2d8fa70e41191e6cd53"
  }, {
    "url": "manifest.webmanifest",
    "revision": "8bc9abd240c5aae45d10bfd3e8bc6f40"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
