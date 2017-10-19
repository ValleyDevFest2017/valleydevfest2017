'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.saveUserData = functions.auth.user().onCreate(({ data }) => {
  const uid = data.uid || data.providerData[0].uid;
  const email = data.email || '';
  const displayName = data.displayName || '';
  const photoURL = data.photoURL || '';
  if (!email && data.providerData) {
    email = data.providerData[0].email;
    displayName = data.providerData[0].displayName;
    photoURL = data.providerData[0].photoURL;
  }
  const userData = {
    email: email,
    displayName: displayName,
    photoURL: photoURL
  };

  return admin.database().ref(`/users/${uid}`).set(userData);
});
