$(document).ready(function() {
	var currentRoom = "27cPsHOUnJzK54esCE1Y";
	var allUsers = [];
	var currentWord = "";
	var me = "";//current user

	

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
       		
       		//if it changed, listen to the current word
	       	if(currentWord != doc.data().woord){
       			$("#word,span.theword").text(doc.data().woord);

       			$(".deelnemers > div").removeClass('wordOwner');
       			$(".deelnemers > div[data-userid='"+doc.data().wordOwner+"']").addClass('wordOwner');

	       		db.collection("rooms").doc(currentRoom)
				.collection("woorden").doc(doc.id).collection("submissions")
				.onSnapshot(function(submissions) {
			    	var wordHtml="";
			        submissions.forEach(function(submission) {
			    		var data=submission.data();
			       		wordHtml+=`<li class="${data.voted ? (data.voted.includes(me) ? "selected":""):"" }">${data.uitleg} `;
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
			    });
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
	    });;

    }
    init();

    $(".wordOwnerOnly").css('display', 'block');
	   


	//call when a user has sent a word
    function resetRound(userId){

    }
	//call when a user has sent a word
    function addedWord(userId){

    }
});