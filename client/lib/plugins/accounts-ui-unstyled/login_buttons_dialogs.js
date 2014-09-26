//
// populate the session so that the appropriate dialogs are
// displayed by reading variables set by accounts-base, which parses
// special URLs. since accounts-ui depends on accounts-base, we are
// guaranteed to have these set at this point.
//
Meteor.setTimeout(function(){

  if (Accounts._resetPasswordToken) {
    Accounts._loginButtonsSession.set('resetPasswordToken', Accounts._resetPasswordToken);
  }

  if (Accounts._enrollAccountToken) {
    Accounts._loginButtonsSession.set('enrollAccountToken', Accounts._enrollAccountToken);
  }
  
}, 1000)

// Needs to be in Meteor.startup because of a package loading order
// issue. We can't be sure that accounts-password is loaded earlier
// than accounts-ui so Accounts.verifyEmail might not be defined.
Meteor.startup(function () {
  if (Accounts._verifyEmailToken) {
    Accounts.verifyEmail(Accounts._verifyEmailToken, function(error) {
      Accounts._enableAutoLogin();
      if (!error)
        Accounts._loginButtonsSession.set('justVerifiedEmail', true);
      // XXX show something if there was an error.
    });
  }
});


//
// resetPasswordDialog template
//

Template._resetPasswordDialog.events({
  'click #login-buttons-reset-password-button': function () {
    resetPassword();
  },
  'keypress #reset-password-new-password': function (event) {
    if (event.keyCode === 13)
      resetPassword();
  },
  'click #login-buttons-cancel-reset-password': function () {
    Accounts._loginButtonsSession.set('resetPasswordToken', null);
    Accounts._enableAutoLogin();
  }
});

var resetPassword = function () {
  Accounts._loginButtonsSession.resetMessages();
  var newPassword = document.getElementById('reset-password-new-password').value;
  if (!validatePassword(newPassword))
    return;

  Accounts.resetPassword(
    Accounts._loginButtonsSession.get('resetPasswordToken'), newPassword,
    function (error) {
      if (error) {
        Accounts._loginButtonsSession.errorMessage(error.reason || "Unknown error");
      } else {
        Accounts._loginButtonsSession.set('resetPasswordToken', null);
        Accounts._loginButtonsSession.set('justResetPassword', true);
        Accounts._enableAutoLogin();
      }
    });
};

Template._resetPasswordDialog.inResetPasswordFlow = function () {
  return Accounts._loginButtonsSession.get('resetPasswordToken');
};

//
// justResetPasswordDialog template
//

Template._justResetPasswordDialog.events({
  'click #just-verified-dismiss-button': function () {
    Accounts._loginButtonsSession.set('justResetPassword', false);
  }
});

Template._justResetPasswordDialog.visible = function () {
  return Accounts._loginButtonsSession.get('justResetPassword');
};

Template._justResetPasswordDialog.displayName = displayName;



//
// enrollAccountDialog template
//

Template._enrollAccountDialog.events({
  'click #login-buttons-enroll-account-button': function () {
    enrollAccount();
  },
  'keypress #enroll-account-password': function (event) {
    if (event.keyCode === 13)
      enrollAccount();
  },
  'click #login-buttons-cancel-enroll-account': function () {
    Accounts._loginButtonsSession.set('enrollAccountToken', null);
    Accounts._enableAutoLogin();
  }
});

var enrollAccount = function () {
  Accounts._loginButtonsSession.resetMessages();
  var password = document.getElementById('enroll-account-password').value;
  if (!validatePassword(password))
    return;

  Accounts.resetPassword(
    Accounts._loginButtonsSession.get('enrollAccountToken'), password,
    function (error) {
      if (error) {
        Accounts._loginButtonsSession.errorMessage(error.reason || "Unknown error");
      } else {
        Accounts._loginButtonsSession.set('enrollAccountToken', null);
        Accounts._enableAutoLogin();
      }
    });
};

Template._enrollAccountDialog.inEnrollAccountFlow = function () {
  return Accounts._loginButtonsSession.get('enrollAccountToken');
};


//
// justVerifiedEmailDialog template
//

Template._justVerifiedEmailDialog.events({
  'click #just-verified-dismiss-button': function () {
    Accounts._loginButtonsSession.set('justVerifiedEmail', false);
  }
});

Template._justVerifiedEmailDialog.visible = function () {
  return Accounts._loginButtonsSession.get('justVerifiedEmail');
};

Template._justVerifiedEmailDialog.displayName = displayName;


//
// loginButtonsMessagesDialog template
//

Template._loginButtonsMessagesDialog.events({
  'click #messages-dialog-dismiss-button': function () {
    Accounts._loginButtonsSession.resetMessages();
  }
});

Template._loginButtonsMessagesDialog.visible = function () {
  var hasMessage = Accounts._loginButtonsSession.get('infoMessage') || Accounts._loginButtonsSession.get('errorMessage');
  return !dropdown() && hasMessage;
};


//
// configureLoginServiceDialog template
//

Template._configureLoginServiceDialog.events({
  'click .configure-login-service-dismiss-button': function () {
    Accounts._loginButtonsSession.set('configureLoginServiceDialogVisible', false);
  },
  'click #configure-login-service-dialog-save-configuration': function () {
    if (Accounts._loginButtonsSession.get('configureLoginServiceDialogVisible') &&
        ! Accounts._loginButtonsSession.get('configureLoginServiceDialogSaveDisabled')) {
      // Prepare the configuration document for this login service
      var serviceName = Accounts._loginButtonsSession.get('configureLoginServiceDialogServiceName');
      var configuration = {
        service: serviceName
      };

      // Fetch the value of each input field
      _.each(configurationFields(), function(field) {
        configuration[field.property] = document.getElementById(
          'configure-login-service-dialog-' + field.property).value
          .replace(/^\s*|\s*$/g, ""); // trim() doesnt work on IE8;
      });

      configuration.loginStyle =
        $('#configure-login-service-dialog input[name="loginStyle"]:checked')
        .val();

      // Configure this login service
      Accounts.connection.call(
        "configureLoginService", configuration, function (error, result) {
          if (error)
            Meteor._debug("Error configuring login service " + serviceName,
                          error);
          else
            Accounts._loginButtonsSession.set('configureLoginServiceDialogVisible',
                                    false);
        });
    }
  },
  // IE8 doesn't support the 'input' event, so we'll run this on the keyup as
  // well. (Keeping the 'input' event means that this also fires when you use
  // the mouse to change the contents of the field, eg 'Cut' menu item.)
  'input, keyup input': function (event) {
    // if the event fired on one of the configuration input fields,
    // check whether we should enable the 'save configuration' button
    if (event.target.id.indexOf('configure-login-service-dialog') === 0)
      updateSaveDisabled();
  }
});

// check whether the 'save configuration' button should be enabled.
// this is a really strange way to implement this and a Forms
// Abstraction would make all of this reactive, and simpler.
var updateSaveDisabled = function () {
  var anyFieldEmpty = _.any(configurationFields(), function(field) {
    return document.getElementById(
      'configure-login-service-dialog-' + field.property).value === '';
  });

  Accounts._loginButtonsSession.set('configureLoginServiceDialogSaveDisabled', anyFieldEmpty);
};

// Returns the appropriate template for this login service.  This
// template should be defined in the service's package
var configureLoginServiceDialogTemplateForService = function () {
  var serviceName = Accounts._loginButtonsSession.get('configureLoginServiceDialogServiceName');
  // XXX Service providers should be able to specify their configuration
  // template name.
  return Template['configureLoginServiceDialogFor' +
                  (serviceName === 'meteor-developer' ?
                   'MeteorDeveloper' :
                   capitalize(serviceName))];
};

var configurationFields = function () {
  var template = configureLoginServiceDialogTemplateForService();
  return template.fields();
};

Template._configureLoginServiceDialog.configurationFields = function () {
  return configurationFields();
};

Template._configureLoginServiceDialog.visible = function () {
  return Accounts._loginButtonsSession.get('configureLoginServiceDialogVisible');
};

Template._configureLoginServiceDialog.configurationSteps = function () {
  // renders the appropriate template
  return configureLoginServiceDialogTemplateForService();
};

Template._configureLoginServiceDialog.saveDisabled = function () {
  return Accounts._loginButtonsSession.get('configureLoginServiceDialogSaveDisabled');
};

// XXX from http://epeli.github.com/underscore.string/lib/underscore.string.js
var capitalize = function(str){
  str = str == null ? '' : String(str);
  return str.charAt(0).toUpperCase() + str.slice(1);
};
