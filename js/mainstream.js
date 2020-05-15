$(document).ready(function() {
	var currentGame= new Object;
	var allUsers = [];
	var me = ""; //current user, you
	var selectedDefinition=false;
	var voted = false;

	var wordsListener,submissionFunction; //listeners

	//room and user handling on init
	if(getUrlVars()["kamer"] && getUrlVars()["kamer"].length > 15){
		currentGame.room=getUrlVars()["kamer"];

		//listen to room updates
		db.collection("rooms").doc(currentGame.room)
		.onSnapshot(function(snap) {
	        if(snap.exists){
		        //create a user if they have none
		        $("#roomname").text(snap.data().roomname);
		   		$("#ronde").text("Woord "+snap.data().huidigWoord);
		   	}else{
		   		alert("room does not exist, redirect");
		   		window.location.href = "index.html";
		   	}
	    },function(error) {
			handleError(error);
		});

		if(localStorage.getItem("WBS-"+getUrlVars()["kamer"])){
			//perhaps valid room, loged in
			me = localStorage.getItem("WBS-"+getUrlVars()["kamer"]);
		}else{
			alert("username not found, redirect");
			window.location.href = "index.html";
		}
	}else{
		window.location.href = "index.html"; //no room given, redirect!
	}

	//listen to all user updates & scores and shit	
	db.collection("rooms").doc(currentGame.room)
	.collection("users").orderBy("createdDate","desc").where("allowed","==",true)
	.onSnapshot(function(snap) {
    	var userHtml="";
    	allUsers={};
    	$(".deelnemers").html("");
        snap.forEach(function(doc) {
        	allUsers[doc.id]={
        		"username":doc.data().username,
        		"punten":doc.data().punten,
        		"createdDate":doc.data().createdDate.seconds
        	};
        	$(".deelnemers")
        		.append($(`<div class="${currentGame.wordOwner==doc.id ? "wordOwner":""}" data-userid="${doc.id}" title="${doc.data().username}">`)
        		.append($("<h3></h3>").text(doc.data().username))
        		.append($("<h4></h4>").addClass('text-muted').addClass('score').text(doc.data().punten))
        		.append(`<div class="checkmark"><svg class="bi bi-check-circle" width="1.5em" height="1.5em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L8 9.293l6.646-6.647a.5.5 0 01.708 0z" clip-rule="evenodd"></path><path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1013.5 8a.5.5 0 011 0 6.5 6.5 0 11-3.25-5.63.5.5 0 11-.5.865A5.472 5.472 0 008 2.5z" clip-rule="evenodd"></path></svg></div>`));

        });

    },function(error) {
		handleError(error);
	});

    //listen to all words, select latest	
	db.collection("rooms").doc(currentGame.room)
	.collection("woorden").orderBy("createdDate","desc").limit(1) //TODO: add create button if none is found
	.onSnapshot(function(snap) {
    	var userHtml="";
        snap.forEach(function(doc) {
       		var woorddata=doc.data();
       		//if it changed, listen to the current word

   			$(".deelnemers > div").removeClass('wordOwner');
   			$(".deelnemers > div[data-userid='"+woorddata.wordOwner+"']").addClass('wordOwner');
   			$(".deelnemers .checkmark").hide();

   			currentGame.wordID = doc.id;
   			currentGame.wordOwner = woorddata.wordOwner;

   			//reset
   			if(currentGame.status=="finishing" && woorddata.status=="new"){
   				selectedDefinition=false;
   			}

			$(".tooltip").tooltip("hide");	

   			currentGame.status=woorddata.status;
			$(".wordOwnerOnly").hide();

   			//handle status
	   		if(woorddata.status){

	   			//need to quit a firebase listener, if it exists, destroy it
				if(submissionFunction instanceof Function){
        			submissionFunction();
        		}

	   			//NEW status
				if(woorddata.status == "new"){
					$(".mode").hide();
					$("#word,span.theword").text(allUsers[woorddata.wordOwner].username+" is aan het woord...");
					$("[data-mode='wachten'] span.theword").text(allUsers[woorddata.wordOwner].username+"...");
					$(".mode[data-mode='wachten']").show();	

				//WRITING status
				}else if(woorddata.status == "writing"){
   					$("#word,span.theword").text(woorddata.woord);
					$(".mode").hide();
					$(".mode[data-mode='enterBetekenis']").show();

					submissionFunction = db.collection("rooms").doc(currentGame.room)
					.collection("woorden").doc(doc.id).collection("submissions").orderBy("randomOrder","desc")
					.onSnapshot(function(submissions) {
						var countSubmissions=0;
				        submissions.forEach(function(submission) {
				        	countSubmissions++;
				    		$(".deelnemers > div[data-userid='"+submission.id+"'] > div.checkmark").show();
				       	});
				       	if(countSubmissions==Object.keys(allUsers).length){
				       		//ga automatisch door naar de volgende ronde
				       		$("#awaitingPlayers").html("Iedereen is klaar! Over <b>5</b> seconden gaan we door naar de volgende ronde!");

				       		ProgressCountdown(5,"#awaitingPlayers>b").then(val => {
				       		})
				       	}else{
				       		//update het nummertje
				       		$("#awaitingPlayers").html("Al <b>"+(countSubmissions)+"</b> van de <b>"+Object.keys(allUsers).length+"</b> spelers zijn klaar... Nog even wachten op de rest.");
				       	}
				       
				    },function(error) {
						handleError(error);
					});

				//PICKING status
				}else if(woorddata.status == "picking"){
   					$("#word,span.theword").text(woorddata.woord);
					$(".mode").hide();
					$(".mode[data-mode='displayWordsPicking']").show();
					$("#selectBetekenis").addClass('disabled');
					$("#wordExplanationPicking").text("");
					
					//get all words -> for voting round
		       		submissionFunction = db.collection("rooms").doc(currentGame.room)
					.collection("woorden").doc(doc.id).collection("submissions").orderBy("randomOrder","desc")
					.onSnapshot(function(submissions) {
				    	var votedTotal=0;
				    	voted=false;
					    $("#wordExplanationPicking").html("");
				        
				        submissions.forEach(function(submission) {
				    		var data=submission.data();
				    		if(data.voted && data.voted.includes(me)){
				    			voted = true;
				    		}

				    		//if user already voted, hide button
							voted || woorddata.wordOwner == me ? $("#selectBetekenis").hide() : $("#selectBetekenis").show();

				    		var data = submission.data();
				    		$("#wordExplanationPicking").append($(`<li class="${selectedDefinition == submission.id ? "selected": ""}" data-definitionid="${submission.id}"></li>`).text(data.uitleg));

					       	if(data.voted){
					       		votedTotal+=data.voted.length;
					       		data.voted.forEach(function(index,val) {
									$(".deelnemers > div[data-userid='"+index+"'] > div.checkmark").show();
					       		})
				       		}

				       		
				       	});

				       	if(votedTotal != Object.keys(allUsers).length-1){
				       		$("#votedTotal").html("Al <b>"+votedTotal+"</b> van de <b>"+(Object.keys(allUsers).length-1)+"</b> stemmen binnen...")
				       	}else{
				       		$("#votedTotal").html("Iedereen heeft gestemd!");
				       	}
				    },function(error) {
						handleError(error);
					});

				//FINISHING status
				}else if(doc.data().status == "finishing"){
   					$("#word,span.theword").text(doc.data().woord);
					$(".mode").hide();
					$(".mode[data-mode='displayWordsFinishing']").show();
					$("#selectBetekenis").hide();
					$(".bottomText").hide();
					$("#wordExplanationFinishing").text("");

					submissionFunction = db.collection("rooms").doc(currentGame.room)
					.collection("woorden").doc(doc.id).collection("submissions").orderBy("randomOrder","desc")
					.onSnapshot(function(submissions) {
				       	$("#wordExplanationFinishing").html("");
				        submissions.forEach(function(submission) {
				    		var data = submission.data();
				    		$("#wordExplanationFinishing").append(`<li class="${data.realDefinition ? "correct": ""}" data-definitionid="${submission.id}"></li>`)

				    		$(`#wordExplanationFinishing > [data-definitionid="${submission.id}]"`).text(data.uitleg);

		       				if(data.voted){
		       					var personen = new Array();
		       					data.voted.forEach(function(index,val){
		       						personen.push(allUsers[index].username);
		       					});
		       					var personenShow = personen.join(", ");

					       		if(data.voted.length == 1){
									$(`#wordExplanationFinishing > [data-definitionid="${submission.id}"]`).append(`<span class="badge badge-primary" data-toggle="tooltip" data-placement="left" title="${personenShow}"> (1 Stem)</span>`);
					       		}else if(data.voted.length > 1){
									$(`#wordExplanationFinishing > [data-definitionid="${submission.id}"]`).append(`<span class="badge badge-primary" data-toggle="tooltip" data-placement="left" title="${personenShow}">(${data.voted.length} Stemmen)</span>`);
					       		}
					       	}
					       $(`#wordExplanationFinishing > [data-definitionid="${submission.id}"]`).append($(`<span class="text-muted">Door </span>`).append($('<b></b>').text(allUsers[submission.id].username)));
				       	});
				       	$('[data-toggle="tooltip"]').tooltip('show')
				    },function(error) {
						handleError(error);
					});
				}
	       	}
        });

    },function(error) {
		handleError(error);
	});

    function init(){
    	$('[data-toggle="tooltip"]').tooltip({
    		trigger:"hover"
    	});
 		

    }
    init();

    //console.log("user: "+me);

	function copyToClipboard(text) {
		var $temp = $("<input>");
		$("body").append($temp);
		$temp.val(text).select();
		document.execCommand("copy");
		$temp.remove();
	}

    function loading(selector){
    	$(selector).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
    }

    function handleError(error){
    	console.log(error);
    }


	//call when a user has sent a word
    function resetFields(){
    	$(".form-control").val("");
    }
	function getUrlVars() {
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
		});
		return vars;
	}
	function ProgressCountdown(timeleft, text) {
		return new Promise((resolve, reject) => {
			var countdownTimer = setInterval(() => {
				timeleft--;
				$(text).text(timeleft);

				if (timeleft <= 0) {
					clearInterval(countdownTimer);
					resolve(true);
				}
			}, 1000);
		});
	}

});