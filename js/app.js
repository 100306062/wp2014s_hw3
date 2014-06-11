(function () {
  Parse.initialize("PNg01BS19GIgtSymZXCzv8XkDSPAlEY9agU6z1Sc",
    "hqCvtaEqquzNMViKdlEikivNJrIXaCtJWD6LX5EO"); //初始化Parse
  var templates = {};
  ["loginView", "evaluationView", "updateSuccessView"].forEach(function (e) {
    templateCode = document.getElementById(e).text;
    templates[e] = doT.template(templateCode); //將各版型compile並載入記憶體中
  });

  var commons = {
    loginRequiredView: function (ViewFunction) {
      return function () {
        var currentUser = Parse.User.current();//當前使用者判定
        if (currentUser) {
          ViewFunction();
        } else {
          window.location.hash = "login/" + window.location.hash;
        }
      }
    },
  }

  var handlers = {
    navbar: function () { //navigation bar之狀態切換
      var currentUser = Parse.User.current(); 
      if (currentUser) { //如為該位使用者
        document.getElementById("loginButton").style.display = "none"; //不顯示登入按鈕
        document.getElementById("logoutButton").style.display = "block"; //顯示登出按鈕
        document.getElementById("evaluationButton").style.display = "block";//顯示評分表
      } else { //不為該位使用者
        document.getElementById("loginButton").style.display = "block"; //顯示登入按鈕
        document.getElementById("logoutButton").style.display = "none"; //不顯示登出按鈕
        document.getElementById("evaluationButton").style.display = "none"; //不顯示評分表
      }
      document.getElementById("logoutButton").addEventListener('click', function () { //按鈕點擊事件
        Parse.User.logOut(); //登出
        handlers.navbar(); //navbar改變
        window.location.hash = 'login/';
      });
    },
    evaluationView: commons.loginRequiredView(function () { //評分view()
      var Evaluation = Parse.Object.extend('Evaluation');//設定Class-Based權限
      var currentUser = Parse.User.current();      
      var evaluationACL = new Parse.ACL();//設定ACL全縣
      evaluationACL.setPublicReadAccess(false);//設定只有開發者能讀取此ACL
      evaluationACL.setPublicWriteAccess(false);//設定只有開發者能編輯此ACL
      evaluationACL.setReadAccess(currentUser, true);//設定只有當前使用者能讀取此ACL
      evaluationACL.setWriteAccess(currentUser, true);//設定只有當前使用者能讀取此ACL
      var query = new Parse.Query(Evaluation);
      query.equalTo('user', currentUser);
      query.first({
        success: function(evaluation){
          window.EVAL = evaluation;
          if(evaluation === undefined){
            var TeamMembers = TAHelp.getMemberlistOf(currentUser.get('username')).filter(function(e){
              return (e.StudentId !== currentUser.get('username') ) ? true : false;
            }).map(function(e){
              e.scores = ['0', '0', '0', '0'];
              return e;
            });
          } else {
            var TeamMembers = evaluation.toJSON().evaluations;
          }
          document.getElementById('content').innerHTML = templates.evaluationView(TeamMembers);
          document.getElementById('evaluationForm-submit').value = ( evaluation === undefined ) ? '送出表單' :'修改表單';
          document.getElementById('evaluationForm').addEventListener('submit', function(){
            for(var i = 0; i < TeamMembers.length; i++){
              for(var j = 0; j < TeamMembers[i].scores.length; j++){
                var e = document.getElementById('stu'+TeamMembers[i].StudentId+'-q'+j);
                var amount = e.options[e.selectedIndex].value;
                TeamMembers[i].scores[j] = amount;
              }
            }
            if( evaluation === undefined ){
              evaluation = new Evaluation();
              evaluation.set('user', currentUser);
              evaluation.setACL(evaluationACL);
            }
            console.log(TeamMembers);
            evaluation.set('evaluations', TeamMembers);
            evaluation.save(null, {
              success: function(){
                document.getElementById('content').innerHTML = templates.updateSuccessView();
              },
              error: function(){},
            });

          }, false);
        }, error: function(object, err){
        
        }
      }); 
    }),
	
	
    loginView: function (redirect) { //登入view函數
      var checkVaildStudentID = function(DOM_ID) { //綁定登入表單的學號檢查事件()
        var student_ID = document.getElementById(DOM_ID).value;
        return (TAHelp.getMemberlistOf(student_ID) === false) ? false : true;
      }
      var showMessage = function(DOM_ID, fn, msg) {
        if (!fn()) {
          document.getElementById(DOM_ID).innerHTML = msg;
          document.getElementById(DOM_ID).style.display = "block";
        } else {
          document.getElementById(DOM_ID).style.display = "none";
        }
      }
      var postAction = function() { //改變navbar
        handlers.navbar();
        window.location.hash = (redirect) ? redirect : '';
      }
      var passwordMatch = function(){ // 綁定註冊表單的密碼檢查事件(); 
        var singupForm_password = document.getElementById('form-signup-password');
        var singupForm_password1 = document.getElementById('form-signup-password1');
        var BOOL = (singupForm_password.value === singupForm_password1.value) ? true : false;
        showMessage('form-signup-message', function(){return BOOL;}, 'Passwords don\'t match.');
        return BOOL;
      }

      document.getElementById("content").innerHTML = templates.loginView();
      document.getElementById("form-signin-student-id").addEventListener("keyup", function () {
        showMessage('form-signin-message', function(){return checkVaildStudentID("form-signin-student-id")}
            , 'The student is not one of the class students.');
      });
      document.getElementById("form-signin").addEventListener("submit", function () {
        if (!checkVaildStudentID("form-signin-student-id")) {
          alert("The student is not one of the class students.");
          return false;
        }
		
        Parse.User.logIn(document.getElementById("form-signin-student-id").value, //綁定登入表單的登入檢查事件()
          document.getElementById("form-signin-password").value, {
            success: function(user) {
              postAction();
            },
            error: function (user, error) {
              showMessage('form-signin-message', function () {
                return false;
              }, "Invaild username or password.");//失敗則回傳
            }
          });
      }, false);

      document.getElementById("form-signup-student-id").addEventListener("keyup", function () {
        showMessage('form-signup-message', function(){return checkVaildStudentID("form-signup-student-id")}
            , 'The student is not one of the class students.');
      });
      document.getElementById("form-signup-password1").addEventListener('keyup', passwordMatch);
      document.getElementById("form-signup").addEventListener("submit", function (){
        if (!checkVaildStudentID('form-signup-student-id')){
          alert("The student is not one of the class students."); 
          return false;
        }
        var BOOL = passwordMatch();
        if(!BOOL){
          return false;
        }

        var user = new Parse.User(); //綁定註冊表單的註冊檢查事件()
        user.set("username", document.getElementById('form-signup-student-id').value);
        user.set("password", document.getElementById('form-signup-password').value);
        user.set("email", document.getElementById('form-signup-email').value);
        user.signUp(null, {
          success: function(user){
            postAction();
          },
          error: function(user, error){
            showMessage('form-signup-message', function () {
              return false;
            }, error.message);
          }
        });
      }, false);
    }
  };

  var Router = Parse.Router.extend({
    routes: {
      "": "indexView",   //路徑規劃和處理函數
      "peer-evaluation/": "evaluationView",
      "login/*redirect": "loginView",
    },
    indexView: handlers.evaluationView, //處理函數名稱&函數本體
    evaluationView: handlers.evaluationView,
    loginView: handlers.loginView,
  });

  this.Router = new Router(); //讓router活起來();
  Parse.history.start();
  handlers.navbar();

})();