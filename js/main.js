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
		   		$("#toevoegen span").text(snap.data().shortroom);
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

	var randomTekstje=[
		"Wow zo realistisch!",
		"Goed gevonden!",
		"Dit is eigenlijk het omgekeerde van de mol maar dan met woorden. Ofzoiets",
		"Als dat geen punten oplevert weet ik het ook niet meer...",
		"Kanshebber voor de originaliteitsprijs!",
		"Oei daar stond wel een spellingsfoutje in precies... Neenee mopje",
		"Niet slecht, maar ook ni top.",
		"Dit moet wel de beste zijn!",
		"Zeg 3 keer het woord 'banaan' als je dit leest.",
		"Super goed gedaan, wow!",
		"Hierna nog een rondje?",
		"*BIEP BIEP BLIEP BLOP BEDANKT*",
		"So no one told you life was gonna be this way",
		"5 punten voor Griffoendor!"
	];

	//listen to all user updates & scores and shit	
	db.collection("rooms").doc(currentGame.room)
	.collection("users").orderBy("createdDate","desc").where("allowed","==",true)
	.onSnapshot(function(snap) {
    	var userHtml="";
    	allUsers={};
        snap.forEach(function(doc) {
        	allUsers[doc.id]={
        		"username":doc.data().username,
        		"punten":doc.data().punten,
        		"createdDate":doc.data().createdDate.seconds
        	};
        	userHtml+=`<div class="${currentGame.wordOwner==doc.id ? "wordOwner":""}" data-userid="${doc.id}" title="${doc.data().username}">
                        <h3>${doc.data().username} ${doc.id == me ?" (jezelf)":''}</h3><h4 class="text-muted score">${doc.data().punten}</h4>
                        <div class="checkmark"><svg class="bi bi-check-circle" width="1.5em" height="1.5em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M15.354 2.646a.5.5 0 010 .708l-7 7a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L8 9.293l6.646-6.647a.5.5 0 01.708 0z" clip-rule="evenodd"></path><path fill-rule="evenodd" d="M8 2.5A5.5 5.5 0 1013.5 8a.5.5 0 011 0 6.5 6.5 0 11-3.25-5.63.5.5 0 11-.5.865A5.472 5.472 0 008 2.5z" clip-rule="evenodd"></path></svg></div>
                    </div>`;
        });

        $(".deelnemers").html(userHtml);
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
   			$(".deelnemers > .checkmark").hide();

   			currentGame.wordID = doc.id;
   			currentGame.wordOwner = woorddata.wordOwner;

   			//reset
   			if(currentGame.status=="finishing" && woorddata.status=="new"){
   				$("#betekenisinput,#woordinput").val("");
   				selectedDefinition=false;
   			}

			$(".tooltip").tooltip("hide");	

   			currentGame.status=woorddata.status;
			woorddata.wordOwner == me ? $(".wordOwnerOnly").show() : $(".wordOwnerOnly").hide();

   			//handle status
	   		if(woorddata.status){

	   			//need to quit a firebase listener, if it exists, destroy it
				if(submissionFunction instanceof Function){
        			submissionFunction();
        		}

	   			//NEW status
				if(woorddata.status == "new"){
					$(".mode").hide();
					if(woorddata.wordOwner == me){
   						$("#word,span.theword").text(allUsers[woorddata.wordOwner].username+" is aan het woord...");
						$("#woordinput").val("");
						$("#submitWoord").addClass('disabled');
						$(".mode[data-mode='enterWord']").show();
						
					}else{
   						$("#word,span.theword").text(allUsers[woorddata.wordOwner].username+" is aan het woord...");
						$(".mode[data-mode='wachten']").show();	
					}

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
				       			if(currentGame.wordOwner==me && currentGame.status=="writing"){

						    		//van writing naar picking ronde
									db.collection("rooms").doc(currentGame.room)
									.collection("woorden").doc(currentGame.wordID)
									.update({
										status: "picking"
									}).catch(function(error) {
										handleError(error);
									});
								}
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
				    	var wordHtml="";
				    	var votedTotal=0;
				    	voted=false;
				        submissions.forEach(function(submission) {
				    		var data=submission.data();
				    		if(data.voted && data.voted.includes(me)){
				    			voted = true;
				    		}

				    		//if user already voted, hide button
							voted || woorddata.wordOwner == me ? $("#selectBetekenis").hide() : $("#selectBetekenis").show();

				       		wordHtml+=`<li class="${selectedDefinition == submission.id ? "selected": ""} ${data.voted && data.voted.includes(me) ? "selected" : ""}" data-definitionid="${submission.id}">${data.uitleg} ${submission.id==me?" (Jouw definitie)":""} `;
		       				if(data.voted){
					       		votedTotal+=data.voted.length;
					       		data.voted.forEach(function(index,val) {
									$(".deelnemers > div[data-userid='"+index+"'] > div.checkmark").show();
					       		})
				       		}
				       		wordHtml+=`</li>`;
				       	});
				       	if(votedTotal != Object.keys(allUsers).length-1){
				       		$("#votedTotal").html("Al <b>"+votedTotal+"</b> van de <b>"+(Object.keys(allUsers).length-1)+"</b> stemmen binnen...")
				       	}else{
				       		$("#votedTotal").html("Iedereen heeft gestemd!");
				       	}

				       	$("#wordExplanationPicking").html(wordHtml);

				       	if(woorddata.wordOwner != me || voted!=true){
					       	$("#wordExplanationPicking > li").click(function(event) {
						    	event.preventDefault();
						    	$("#wordExplanationPicking > li").removeClass('selected');
						    	selectedDefinition = $(this).attr("data-definitionid");
						    	if(selectedDefinition!=me && currentGame.wordOwner != me){
						    		$(this).addClass('selected');
						    		$("#selectBetekenis").removeClass('disabled');
						    	}else{
									selectedDefinition=false;
						    		$("#selectBetekenis").addClass('disabled');
						    	}
						    });
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
				    	var wordHtml = "";
				        submissions.forEach(function(submission) {
				    		var data = submission.data();
				       		wordHtml += `<li class="${data.realDefinition ? "correct": ""}" data-definitionid="${submission.id}">${data.uitleg} `;
		       				if(data.voted){
		       					var personen = new Array();
		       					data.voted.forEach(function(index,val){
		       						personen.push(allUsers[index].username);
		       					});
		       					var personenShow = personen.join(", ");

					       		if(data.voted.length == 1){
									wordHtml += `<span class="badge badge-primary" data-toggle="tooltip" data-placement="left" title="${personenShow}"> (1 Stem)</span>`;
					       		}else if(data.voted.length > 1){
									wordHtml += `<span class="badge badge-primary" data-toggle="tooltip" data-placement="left" title="${personenShow}">(${data.voted.length} Stemmen)</span>`;
					       		}
					       	}
					       	wordHtml += `<span class="text-muted">Door <b>${allUsers[submission.id].username}</b></span>`;
				       		wordHtml += `</li>`;
				       	});

				       	$("#wordExplanationFinishing").html(wordHtml);

				       	$("#nextRoundCountdown").html("Over <b>30</b> seconden gaan we door naar de volgende ronde.").show();

			       		ProgressCountdown(30,"#nextRoundCountdown>b").then(val => {
   							toNextRound();
			       		})

				       	$('.badge[data-toggle="tooltip"]').tooltip();
				       	if(woorddata.wordOwner == me){
				       		$("#nextRound").show();
				       	} 
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
				if(currentGame.wordID!="" && currentGame.status=="writing"){
					loading("#submitBetekenis");
					//submit woord!
					db.collection("rooms").doc(currentGame.room)
					.collection("woorden").doc(currentGame.wordID)
					.collection("submissions").doc(me).set({
						realDefinition: currentGame.wordOwner == me ? true : false,
						uitleg: $("#betekenisinput").val(),
						randomOrder: Math.random()
					}).then(function(docRef){
						$(".mode").hide();						
						$(".mode[data-mode='afterSubmit'] > p:first-of-type").text(randomTekstje[Math.floor(Math.random()*randomTekstje.length)]);
						$(".mode[data-mode='afterSubmit']").show(300);
						$("#submitBetekenis").text("Stuur op!");
						gtag('event', 'action', {
							'event_label': 'Game',
							'event_category': 'SubmitBetekenis'
						});

					}).catch(function(error) {
						handleError(error);
						$("#submitBetekenis").text("Stuur op!");
					});
				}
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
	    		if(currentGame.wordID!="" && currentGame.status=="new"){
					//submit woord!
					db.collection("rooms").doc(currentGame.room)
					.collection("woorden").doc(currentGame.wordID)
					.update({
						status: "writing",
						woord: $("#woordinput").val()
					}).catch(function(error) {
						handleError(error);
					});
				}
				resetFields();
	    	}
	    }).on('click', '#resetWord > a', function(event) {
	    	event.preventDefault();
	    	if(currentGame.wordID!=""){
				//submit woord!
				db.collection("rooms").doc(currentGame.room)
				.collection("woorden").doc(currentGame.wordID)
				.update({
					status: "new",
					woord: ""
				}).catch(function(error) {
					handleError(error);
				});
			}
	    }).on('click', '#toPickingRound > a', function(event) {
	    	event.preventDefault();
	    	if(currentGame.wordOwner==me && currentGame.status=="writing"){
	    		//van writing naar picking ronde
				db.collection("rooms").doc(currentGame.room)
				.collection("woorden").doc(currentGame.wordID)
				.update({
					status: "picking"
				}).catch(function(error) {
					handleError(error);
				});
			}
	    }).on('click', '#nextStatus', function(event) {
	    	event.preventDefault();
	    	if(currentGame.wordOwner==me && currentGame.status=="picking"){
	    		//van writing naar picking ronde
				db.collection("rooms").doc(currentGame.room)
				.collection("woorden").doc(currentGame.wordID)
				.update({
					status: "finishing"
				}).catch(function(error) {
					handleError(error);
				});
			}
	    }).on('click', '#selectBetekenis', function(event) {
	    	event.preventDefault();
	    	if(currentGame.status=="picking" && selectedDefinition!=me){
	    		if(selectedDefinition != false){
					db.collection("rooms").doc(currentGame.room)
					.collection("woorden").doc(currentGame.wordID)
					.collection("submissions").doc(selectedDefinition)
					.update({
						voted: firebase.firestore.FieldValue.arrayUnion(me)
					}).catch(function(error) {
						handleError(error);
					});
					gtag('event', 'action', {
						'event_label': 'Game',
						'event_category': 'SelectBetekenis'
					});
				}
			}
	    }).on('click', '.deelnemers > div', function(event) {
	    	event.preventDefault();
    		var selectedDeelnemer = $(this).attr("data-userid");
	    	/*if(currentGame.status=="finishing" && currentGame.wordOwner==me && selectedDeelnemer!=me){
	    		db.collection("rooms").doc(currentGame.room)
				.collection("woorden").add({
					createdDate: new Date,
					status: "new",
					woord: "",
					wordOwner: selectedDeelnemer
				}).catch(function(error) {
					handleError(error);
				});
	    	}*/
	    }).on('dblclick', '#toevoegen', function(event) {
	    	event.preventDefault();
	    	$("#toevoegen").toggleClass("hidden");
	    }).on('click', '#nextRound > a', function(event) {
	    	event.preventDefault();
	    	toNextRound();
	    });

    }
    init();

    //console.log("user: "+me);

    $("#toevoegen").click(function(event) {
		copyToClipboard($("#toevoegen > span:first-of-type()").text());
		console.log("copied!");
		$("#toevoegen").attr('data-original-title', "Gekopieerd!").tooltip('show');
    }).mouseout(function(event) {
    	$("#toevoegen").attr('data-original-title', "Klik om de code te kopiëren, dubbelklik om ze te verbergen/tonen.");
    });


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

    function toNextRound(){
    	if(currentGame.status=="finishing" && currentGame.wordOwner==me){
    		var allUsersIDsSortedByDate = [];
    		Object.keys(allUsers).forEach((i,val) => {
    			allUsersIDsSortedByDate.push(i);
    		})
    		var position = Object.keys(allUsers).indexOf(currentGame.wordOwner);
    		if((position+1) >= (Object.keys(allUsers).length)){
    			var nextperson = allUsersIDsSortedByDate[0];
    		}else{
    			var nextperson = allUsersIDsSortedByDate[position+1];
    		}

    		db.collection("rooms").doc(currentGame.room)
				.collection("woorden").add({
					createdDate: new Date,
					status: "new",
					woord: "",
					wordOwner: nextperson
				}).catch(function(error) {
					handleError(error);
				});
    	}
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

	setTimeout(() => {  
		$("#mobileOverlay").hide(500);
		$("#game").css('filter', 'blur(0)'); 
	}, 5000);

	$(document).on('click', '#mobileOverlay', function(event) {
		event.preventDefault();
		$("#mobileOverlay").hide();			
		$("#game").css('filter', 'blur(0)'); 
	});
	
});