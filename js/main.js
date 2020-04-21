$(document).ready(function() {
	var currentRoom = "27cPsHOUnJzK54esCE1Y";
	var allUsers=[];
	var currentWord="";

	//listener
	var wordsListener;

	//listen to room updates
	db.collection("rooms").doc(currentRoom)
	.onSnapshot(function(snap) {
        $("#roomname").text(snap.data().roomname);
   		$("#ronde").text("Ronde "+snap.data().huidigWoord)
    });

	//listen to all user updates & scores and shit	
	db.collection("rooms").doc(currentRoom)
	.collection("users").where("allowed","==",true)
	.onSnapshot(function(snap) {
    	var userHtml="";
    	allUsers=[];
        snap.forEach(function(doc) {
        	allUsers[doc.id]={
        		"username":doc.data().username,
        		"punten":doc.data().punten,
        	};
        	userHtml+=`<div>
                        <h3>${doc.data().username}</h3><h4 class="text-muted score">${doc.data().punten}</h4>
                    </div>`;
        });
        $(".deelnemers").html(userHtml);
    });

    //listen to all words	
	db.collection("rooms").doc(currentRoom)
	.collection("woorden").orderBy("createdDate","desc").limit(1)
	.onSnapshot(function(snap) {
    	var userHtml="";
        snap.forEach(function(doc) {
       		$("#word").text(doc.data().woord);
       	
	       	if(currentWord != doc.data().woord){
	     	alert(doc.id)
	       		db.collection("rooms").doc(currentRoom)
				.collection("woorden").doc(doc.id).collection("submissions")
				.onSnapshot(function(submissions) {
			    	var wordHtml="";
			        submissions.forEach(function(submission) {
			       		wordHtml+=`<li>${submission.data().uitleg}</li>`;
			       	});
			       	$("#wordExplanation").html(wordHtml);
			    });
	       	}
        });

    });


	//call when a user has sent a word
    function resetRound(userId){

    }
	//call when a user has sent a word
    function addedWord(userId){

    }
});