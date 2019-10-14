let bulbs = [

    "LEDBLE-78630D85:r:1-1", // 1-1  F8:1D:78:63:0D:85
    "LEDBLE-78631C80:b:1-2", // 1-2  F8:1D:78:63:1C:80
    "LEDBLE-78630D44:b:1-3", // 1-3  F8:1D:78:63:0D:44
  
    "LEDBLE-78631D51:r:2-1", // 2-1  F8:1D:78:63:1D:51
    "LEDBLE-78633300:g:2-2", // 2-2  F8:1D:78:63:33:00
    "LEDBLE-78631A94:g:2-3", // 2-3  F8:1D:78:63:1A:94
  
    "LEDBLE-78631D3E:r:3-1", // 3-1  F8:1D:78:63:1D:3E
    "LEDBLE-786310B1:b:3-2", // 3-2  F8:1D:78:63:10:B1
    "LEDBLE-786311CD:r:3-3", // 3-3  F8:1D:78:63:11:CD
  
    "LEDBLE-78631FC2:g:4-1", // 4-1  F8:1D:78:63:1F:C2
    "LEDBLE-786313DD:r:4-2", // 4-2  F8:1D:78:63:13:DD
    "LEDBLE-7862F141:r:4-3", // 4-3  F8-1D-78-62-F1:41

    "LEDBLE-78631836:r:5-1", // 5-1  F8:1D:78:63:18:36
    "LEDBLE-7863123D:r:5-2", // 5-2  F8:1D:78:63:12:3D
    "LEDBLE-78630E2C:b:5-3", // 5-3  F8:1D:78:63:0E:2C
  
    "LEDBLE-78631A58:g:6-1", // 6-1  F8:1D:78:63:1A:58
    "LEDBLE-78633FEC:b:6-2", // 6-2  F8:1D:78:63:3F:EC
    "LEDBLE-78631C98:r:6-3", // 6-3  F8:1D:78:63:1C:98
]

exports.getBulbs = function(start, end) {
    return bulbs.filter((bulb, index) => index >= start && index < end);
}