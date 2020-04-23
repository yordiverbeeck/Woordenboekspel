$(document).ready(function() {
	var currentRoom = "";
	var allUsers = [];
	var currentWord = "";
	var me = "9uyEjlo2ZU1L8wjxqotB"; //current user
	var selectedDefinition="";
	var voted = false;

	//room and user handling
	if(getUrlVars()["kamer"] && getUrlVars()["kamer"].length > 15){
		currentRoom=getUrlVars()["kamer"];
		if(localStorage.getItem("WBS-"+getUrlVars()["kamer"])){
			//perhaps valid room, loged in
			me = localStorage.getItem("WBS-"+getUrlVars()["kamer"]);
		}else{
			//perhaps valid room, not logged in yet
			//check valid room
			//login user
		}
	}else{
		//no room given, redirect!
		window.location.href = "index.html";
	}

	//check in local storage if user has room session things
	

	var randomTekstje=[
		"Wow zo realistisch!",
		"Alé dit gelooft toch niemand...",
		"Goed gevonden!",
		"Dit is eigenlijk het omgekeerde van de mol maar dan met woorden. Ofzoiets",
		"Als dat geen punten opleverd weet ik het ook niet meer...",
		"Kanshebber voor de originaliteitsprijs!",
		"Oei daar stond wel een spellingsfoutje in precies.",
		"Ni slecht, ma ook ni top.",
		"Dit moet wel de beste zijn!",
		"Zeg 3 keer het woord 'banaan' als je dit leest.",
		"Super goed gedaan, wow!",
		"Hierna nog een rondje?",
		"*BIEP BIEP BLIEP BLOP BEDANKT*",
		"So no one told you life was gonna be this way"
	];

	//listener
	var wordsListener;

	//listen to room updates
	db.collection("rooms").doc(currentRoom)
	.onSnapshot(function(snap) {
        //TODO: do a bunch of other stuff here first
        //create a user if they have none
        $("#roomname").text(snap.data().roomname);
   		$("#ronde").text("Ronde "+snap.data().huidigWoord);
    });

	//listen to all user updates & scores and shit	
	db.collection("rooms").doc(currentRoom)
	.collection("users").orderBy("createdDate","desc").where("allowed","==",true)
	.onSnapshot(function(snap) {
    	var userHtml="";
    	allUsers=[];
        snap.forEach(function(doc) {
        	allUsers[doc.id]={
        		"username":doc.data().username,
        		"punten":doc.data().punten,
        	};
        	userHtml+=`<div data-userid="${doc.id}">
                        <h3>${doc.data().username}</h3><h4 class="text-muted score">${doc.data().punten}</h4>
                    </div>`;
        });
        $(".deelnemers").html(userHtml);
    });

    //listen to all words, select latest	
	db.collection("rooms").doc(currentRoom)
	.collection("woorden").orderBy("createdDate","desc").limit(1)
	.onSnapshot(function(snap) {
    	var userHtml="";
        snap.forEach(function(doc) {
       		var roomdata=doc.data();
       		//if it changed, listen to the current word
	       	if(currentWord != roomdata.woord){

       			$(".deelnemers > div").removeClass('wordOwner');
       			$(".deelnemers > div[data-userid='"+roomdata.wordOwner+"']").addClass('wordOwner');

       			//handle status
		   		if(roomdata.status){

		   			//NEW status
					if(roomdata.status == "new"){
						$(".mode").hide();
						if(roomdata.wordOwner == me){
       						$("#word,span.theword").text("Even geduld...");
							$("#woordinput").val("");
							$("#submitWoord").addClass('disabled');
							$(".mode[data-mode='enterWord']").show();
							
						}else{
							$(".mode[data-mode='wachten']").show();	

						}

					//WRITING status
					}else if(roomdata.status == "writing"){
       					$("#word,span.theword").text(roomdata.woord);
						$(".mode").hide();
						$(".mode[data-mode='enterBetekenis']").show();


						roomdata.wordOwner == me ? $(".wordOwnerOnly").show() : $(".wordOwnerOnly").hide();
						
					//PICKING status
					}else if(roomdata.status == "picking"){
       					$("#word,span.theword").text(roomdata.woord);
						$(".mode").hide();
						$(".mode[data-mode='displayWords']").show();
						$("#selectBetekenis").addClass('disabled');
						
						roomdata.wordOwner == me ? $(".wordOwnerOnly").show() : $(".wordOwnerOnly").hide();

						//get all words -> for voting round
			       		db.collection("rooms").doc(currentRoom)
						.collection("woorden").doc(doc.id).collection("submissions")
						.onSnapshot(function(submissions) {
					    	var wordHtml="";
					    	voted=false;
					        submissions.forEach(function(submission) {
					    		var data=submission.data();
					    		if(data.voted && data.voted.includes(me)){
					    			voted = true;
					    		}

					    		//if user already voted, hide button
								voted || roomdata.wordOwner == me ? $("#selectBetekenis").hide() : $("#selectBetekenis").show();

					       		wordHtml+=`<li class="${selectedDefinition == submission.id ? "selected": ""}" data-definitionid="${submission.id}">${data.uitleg} `;
			       				if(data.voted){
						       		if(data.voted.length == 1){
										wordHtml+=`<span class="badge badge-primary"> (1 Stem)</span>`;
						       		}else if(data.voted.length > 1){
										wordHtml+=`<span class="badge badge-primary">(${data.voted.length} Stemmen)</span>`;
						       		}
						       	}
					       		wordHtml+=`</li>`;
					       	});

					       	$("#wordExplanation").html(wordHtml);

					       	if(roomdata.wordOwner != me || voted!=true){
						       	$("#wordExplanation > li").click(function(event) {
							    	event.preventDefault();
							    	console.log($(this).attr("data-definitionid"));
							    	$("#wordExplanation > li").removeClass('selected');
							    	$(this).addClass('selected');
							    	selectedDefinition = $(this).attr("data-definitionid");
							    	$("#selectBetekenis").removeClass('disabled');
							    });
						    }
					       	
					    });


					//FINISHING status
					}else if(doc.data().status == "finishing"){
       					$("#word,span.theword").text(doc.data().woord);
						$(".mode").hide();
						$(".mode[data-mode='displayWords']").show();
						$("#selectBetekenis").hide();
						$(".bottomText").hide();

						db.collection("rooms").doc(currentRoom)
						.collection("woorden").doc(doc.id).collection("submissions")
						.onSnapshot(function(submissions) {
					    	var wordHtml = "";
					        submissions.forEach(function(submission) {
					    		var data = submission.data();
					       		wordHtml+=`<li class="${data.realDefinition ? "correct": ""}" data-definitionid="${submission.id}">${data.uitleg} `;
			       				if(data.voted){
						       		if(data.voted.length == 1){
										wordHtml+=`<span class="badge badge-primary"> (1 Stem)</span>`;
						       		}else if(data.voted.length > 1){
										wordHtml+=`<span class="badge badge-primary">(${data.voted.length} Stemmen)</span>`;
						       		}
						       	}
						       	wordHtml+=`<span class="text-muted">Door ${allUsers[data.userUID].username}</span>`;
					       		wordHtml+=`</li>`;
					       	});

					       	$("#wordExplanation").html(wordHtml);
					       	if(roomdata.wordOwner == me) $("#nextRound").show();
					    });

					}
		   		}else{

		   		}

	       	}
        });

    });

    function init(){
    	$('[data-toggle="tooltip"]').tooltip();
 		
 		//general listeners
	    $(document).on('keyup', '#betekenisinput', function(event) {
	    	event.preventDefault();
	    	 if($(this).val().length !=0)
	            $('#submitBetekenis').removeClass('disabled');            
	        else
	            $('#submitBetekenis').addClass('disabled');

	    }).on('click', '#submitBetekenis', function(event) {
	    	event.preventDefault();
	    	if(!$(this).hasClass('disabled') && $("#betekenisinput").val().length !=0){
				console.log("oi");
	    	}
	    }).on('keyup', '#woordinput', function(event) {
	    	event.preventDefault();
	    	if($(this).val().length !=0)
	            $('#submitWoord').removeClass('disabled');            
	        else
	            $('#submitWoord').addClass('disabled');

	    }).on('click', '#submitWoord', function(event) {
	    	event.preventDefault();
	    	if(!$(this).hasClass('disabled') && $("#woordinput").val().length !=0){
				console.log("oi");
	    	}
	    }).on('click', '#resetWord > a', function(event) {
	    	event.preventDefault();
	    	/* Act on the event */
	    });

    }
    init();
	   
    console.log("user: "+me);

	//call when a user has sent a word
    function resetRound(userId){

    }
	//call when a user has sent a word
    function addedWord(userId){

    }
	function getUrlVars() {
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
		});
		return vars;
	}
});