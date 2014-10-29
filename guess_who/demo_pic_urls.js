/*
	Just copy everything below this comment into the Web Inspector console, run it, and the cache will be good to go
	for the supplied names and photo URLs
*/

demo = {
	"Wendy Fong" : "http://www.cmu.edu/silicon-valley/images/blogs/wendyfong-award.jpg",
	"Jia Zhang" : "http://www.cmu.edu/silicon-valley/images/personnel/zhang-jia.jpg",
	"Pei Zhang": "https://www.ece.cmu.edu/directory/images/faculty/peizhang.jpg",
	"Ed Katz": "http://cmusv-rails-production.s3.amazonaws.com/REV_911e9c36c36d55c1f840c1d49dd0221144781e35/images/staff/EdKatz.jpg",
	"Joy Zhang": "http://projectile.sv.cmu.edu/images/Joy.Ying.Zhang.CMU.jpg"
}

for(var name in demo){
	localStorage.setItem(name, demo[name]);
}