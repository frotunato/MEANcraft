/*
module.exports = function (app, io) {
	if (app) console.log('there is app');
	if(io) console.log('there is io')
	return {
	a: function (socket) {
		console.log('aaa!')
		if (socket) console.log('there is socket')
	}	
	}
	
}
*/

var a = [
	[1,2,3,4,5],
	[6,7,8,9,10],
	[11,12,13,14,15],
	[16,17,18,19,20],
	[21,22,23,24,25]
]


var a2 = [
	[1,2,3,4,5],
	[6,7,8,9,10],
	[11,12,13,14,15],
	[16,17,18,19,20],
	[21,22,23,24,25]
]

var b = [
	[1,6,11,16,21],
	[2,7,12,17,22],
	[3,8,13,18,23],
	[4,9,14,19,24],
	[5,10,15,20,25]
]

for (var i = 0; i < a.length; i++) {
	for (var j = 1; j < b.length; j++) {
		
		a2[i][j] = a[j][i]
		a2[j][i] = a[i][j]
		//console.log(a[i][j],a[j][i])
	};
};

console.log(a2)