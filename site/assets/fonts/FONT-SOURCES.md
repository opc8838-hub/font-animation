# Additional font sources

The following local fonts were added after reviewing the collections on Fontshare and Free Faces. Only families with a clear SIL Open Font License were bundled; Fontshare families under the proprietary ITF Free Font License were not copied into this public project.

| Family | Discovery collection | Upstream file source | License |
| --- | --- | --- | --- |
| Manrope | Free Faces / Sans Serif | google/fonts `ofl/manrope` | SIL OFL 1.1 |
| League Spartan | Free Faces / Sans Serif | google/fonts `ofl/leaguespartan` | SIL OFL 1.1 |
| Cinzel | Free Faces / Serif + Display | google/fonts `ofl/cinzel` | SIL OFL 1.1 |
| Instrument Serif | Free Faces / Serif | google/fonts `ofl/instrumentserif` | SIL OFL 1.1 |
| Bebas Neue | Free Faces / Display | google/fonts `ofl/bebasneue` | SIL OFL 1.1 |
| Poppins | Fontshare open-source collection | google/fonts `ofl/poppins` | SIL OFL 1.1 |
| Rajdhani | Fontshare open-source collection | google/fonts `ofl/rajdhani` | SIL OFL 1.1 |
| Teko | Fontshare open-source collection | google/fonts `ofl/teko` | SIL OFL 1.1 |
| Khand | Fontshare open-source collection | google/fonts `ofl/khand` | SIL OFL 1.1 |
| Fraunces | Free Faces / Serif | google/fonts `ofl/fraunces` | SIL OFL 1.1 |
| Noto Sans SC Thin | Existing project CJK assets | `site/resources/NotoSansSC-Thin.otf` | SIL OFL 1.1 |
| Noto Sans JP Thin / Black | Existing project CJK assets | `site/assets` + `site/resources` | SIL OFL 1.1 |
| Noto Sans KR Black | Existing project CJK assets | `site/resources/NotoSansKR-Black.otf` | SIL OFL 1.1 |
| Noto Sans HK Variable | City Stack video font matching | google/fonts `ofl/notosanshk` | SIL OFL 1.1 |
| Montserrat Variable | City Stack HK reference · `HONG KONG` | google/fonts `ofl/montserrat` | SIL OFL 1.1 |
| Albert Sans Variable | City Stack HK reference · signature line | google/fonts `ofl/albertsans` | SIL OFL 1.1 |
| Playfair Display Variable | Type Garden · letters (stand-in the original author recommends for GT Ultra) | google/fonts `ofl/playfairdisplay` | SIL OFL 1.1 |
| DM Serif Display | Type Garden · display serif option | google/fonts `ofl/dmserifdisplay` | SIL OFL 1.1 |
| Abril Fatface | Type Garden · fat display serif option | google/fonts `ofl/abrilfatface` | SIL OFL 1.1 |
| Cormorant Variable | Type Garden · light-contrast serif option | google/fonts `ofl/cormorant` | SIL OFL 1.1 |
| Noto Serif SC Bold (GB2312 subset, WOFF2) | Type Garden · Chinese serif and CJK fallback for serif faces | google/fonts `ofl/notoserifsc`, instanced at wght 700 and subset to GB2312 + ASCII with fontTools | SIL OFL 1.1 |
| ZCOOL XiaoWei (WOFF2) | Type Garden · Chinese display option | google/fonts `ofl/zcoolxiaowei`, recompressed to WOFF2 | SIL OFL 1.1 |
| Ma Shan Zheng (WOFF2) | Type Garden · Chinese brush option | google/fonts `ofl/mashanzheng`, recompressed to WOFF2 | SIL OFL 1.1 |

Upstream repository: https://github.com/google/fonts

Per-family license texts are stored in `licenses/` beside the existing font licenses.

Georgia is listed in the font library as a system font only (`"Georgia"`, no file). It ships with Windows, macOS and iOS; its licence does not allow redistribution, so it is not bundled. Devices without it fall back to the next serif.
