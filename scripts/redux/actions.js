const uiActions = {
  toggleDrawer: (value = null) => {
    store.dispatch({
      type: TOGGLE_DRAWER,
      value
    });
  },
  setViewportSize: value => {
    store.dispatch({
      type: SET_VIEWPORT_SIZE,
      value
    });
  },
  setHero: (hero, route) => {
    store.dispatch({
      type: SET_HERO,
      hero: hero || (heroSettings ? heroSettings[route || 'home'] : null)
    });
  },
  toggleVideoDialog: (value = null) => {
    store.dispatch({
      type: TOGGLE_VIDEO_DIALOG,
      value
    });
  }
};

const routingActions = {
  setRoute: (routeFromAction) => {
    const route = routeFromAction || 'home';
    store.dispatch({
      type: SET_ROUTE,
      route
    });
  },
  setSubRoute: subRoute => {
    store.dispatch({
      type: SET_SUB_ROUTE,
      subRoute
    });
  },
  setLocation: url => {
    window.history.pushState({}, '', url);
    Polymer.Base.fire('location-changed', {}, { node: window });
  }
};

const dialogsActions = {
  openDialog: (dialogName, data) => {
    store.dispatch({
      type: OPEN_DIALOG,
      dialog: {
        [dialogName]: {
          isOpened: true,
          data
        }
      }
    });
  },
  closeDialog: (dialogName) => {
    store.dispatch({
      type: CLOSE_DIALOG,
      dialogName
    });
    this.dispatchEvent(new CustomEvent('reset-query-params', {
      bubbles: true,
      composed: true
    }));
  }
};

let toastHideTimeOut;
const toastActions = {
  showToast: toast => {
    const duration = toast.duration || 5000;
    store.dispatch({
      type: SHOW_TOAST,
      toast: Object.assign({}, toast, {
        duration,
        visible: true
      })
    });

    clearTimeout(toastHideTimeOut);
    toastHideTimeOut = setTimeout(() => {
      toastActions.hideToast();
    }, duration);
  },

  hideToast: () => {
    clearTimeout(toastHideTimeOut);
    store.dispatch({
      type: HIDE_TOAST
    });
  }
};

const ticketsActions = {
  fetchTickets: () => {
    return firebase.database()
      .ref('/tickets')
      .on('value', snapshot => store.dispatch({
        type: FETCH_TICKETS,
        tickets: snapshot.val()
      }));
  }
};

const partnersActions = {
  fetchPartners: () => {
    return firebase.database()
      .ref('/partners')
      .on('value', snapshot => store.dispatch({
        type: FETCH_PARTNERS,
        partners: snapshot.val()
      }));
  }
};

const videosActions = {
  fetchVideos: () => {
    return firebase.database()
      .ref('/videos')
      .on('value', snapshot => store.dispatch({
        type: FETCH_VIDEOS,
        videos: snapshot.val()
      }));
  }
};

const blogActions = {
  fetchList: () => {
    return firebase.database()
      .ref('/blog/list')
      .on('value', snapshot => store.dispatch({
        type: FETCH_BLOG_LIST,
        list: snapshot.val()
      }));
  }
};

const speakersActions = {
  fetchList: () => {
    const state = store.getState();
    const sessionsPromise = Object.keys(state.sessions.list).length
      ? Promise.resolve(state.session.list)
      : sessionsActions.fetchList();

    const speakersPromise = new Promise(resolve => {
      firebase.database()
        .ref('/speakers')
        .on('value', snapshot => {
          resolve(snapshot.val());
        })
    });

    return new Promise(resolve => {
      Promise.all([sessionsPromise, speakersPromise])
        .then(([sessions, speakers]) => {
          let updatedSpeakers = {};

          for (let key of Object.keys(sessions)) {
            if (sessions[key].speakers) {
              sessions[key].speakers.map(id => {
                if (speakers[id]) {
                  const session = Object.assign({}, sessions[key], {
                    id: key
                  });
                  updatedSpeakers[id] = Object.assign({}, speakers[id], {
                    sessions: speakers[id].sessions ? [...speakers[id].sessions, session] : [session]
                  });
                }
              });
            }
          }

          const list = Object.assign({}, speakers, updatedSpeakers);

          store.dispatch({
            type: FETCH_SPEAKERS_LIST,
            list
          });

          resolve(list);
        });
    });
  }
};

const sessionsActions = {
  fetchList: () => {
    const result = new Promise(resolve => {
      firebase.database()
        .ref('/sessions')
        .on('value', snapshot => {
          resolve(snapshot.val());
        })
    });

    result
      .then(list => {
        store.dispatch({
          type: FETCH_SESSIONS_LIST,
          list
        });
      });

    return result;
  },

  fetchUserFeaturedSessions: userId => {
    const result = new Promise(resolve => {
      firebase.database()
        .ref(`/featuredSessions/${userId}`)
        .on('value', snapshot => {
          resolve(snapshot.val());
        })
    });

    result
      .then(featuredSessions => {
        store.dispatch({
          type: FETCH_USER_FEATURED_SESSIONS,
          featuredSessions
        });
      });

    return result;
  },

  setUserFeaturedSessions: (userId, featuredSessions) => {
    const result = firebase.database()
      .ref(`/featuredSessions/${userId}`)
      .set(featuredSessions);

      console.log(`setUserFeaturedSessions ${userId} ${JSON.stringify(featuredSessions)}`);

      result
      .then(() => {
        store.dispatch({
          type: SET_USER_FEATURED_SESSIONS,
          featuredSessions
        });
      });

    return result;
  }
};

const scheduleActions = {
  fetchSchedule: () => {
    const state = store.getState();
    const speakersPromise = Object.keys(state.speakers).length
      ? Promise.resolve(state.speakers)
      : speakersActions.fetchList();
    const schedulePromise = new Promise(resolve => {
      firebase.database()
        .ref('/schedule')
        .on('value', snapshot => {
          resolve(snapshot.val());
        })
    });

    return Promise.all([speakersPromise, schedulePromise])
      .then(([speakers, schedule]) => {
        const scheduleWorker = new Worker('/scripts/schedule-webworker.js');

        scheduleWorker.postMessage({
          speakers,
          sessions: store.getState().sessions.list,
          schedule
        });

        scheduleWorker.addEventListener('message', ({ data }) => {
          store.dispatch({
            type: FETCH_SCHEDULE,
            data: data.schedule
          });
          store.dispatch({
            type: UPDATE_SESSIONS,
            list: data.sessions
          });
          store.dispatch({
            type: UPDATE_SPEAKERS,
            list: data.speakers
          });
          scheduleWorker.terminate();
        }, false);

      });
  }
};

const galleryActions = {
  fetchGallery: () => {
    return firebase.database()
      .ref('/gallery')
      .on('value', snapshot => {
        store.dispatch({
          type: FETCH_GALLERY,
          gallery: snapshot.val()
        });
      });
  }
};

const teamActions = {
  fetchTeam: () => {
    return firebase.database()
      .ref('/team')
      .on('value', snapshot => {
        store.dispatch({
          type: FETCH_TEAM,
          team: snapshot.val()
        });
      });
  }
};

const participantsActions = {
  fetchList: () => {
    const result = new Promise(resolve => {
      firebase.database()
        .ref('/participants')
        .on('value', snapshot => {
          resolve(snapshot.val());
        })
    });

    result
      .then(list => {
        store.dispatch({
          type: FETCH_PARTICIPANTS_LIST,
          list
        });
      });

    return result;
  },

  fetchUserParticipant: userId => {
    return firebase.database()
    .ref(`/participants/${userId}`)
    .on('value', snapshot => {
      store.dispatch({
        type: FETCH_USER_PARTICIPANT,
        participant: Object.assign({}, snapshot.val())
      });
    });
  },

  setUserParticipant: (userId, participant) => {
    const result = firebase.database()
      .ref(`/participants/${userId}`)
      .set(participant);

      console.log(`setUserParticipant ${userId} ${JSON.stringify(participant)}`);

      result
      .then(() => {
        store.dispatch({
          type: SET_USER_PARTICIPANT,
          participant
        });
      });

    return result;
  }
};

const avatarActions = {
  fetchAvatarParts: () => {
    return firebase.database()
      .ref('/avatar')
      .on('value', snapshot => {
        store.dispatch({
          type: FETCH_AVATAR_PARTS,
          avatar: snapshot.val()
        });
      });
  }
};

const ratingsActions = {
  fetchUserSessionRatings: userId => {
    return firebase.database()
    .ref(`/ratings/${userId}`)
    .on('value', snapshot => {
      store.dispatch({
        type: FETCH_USER_SESSION_RATINGS,
        ratings: Object.assign({}, snapshot.val())
      });
    });
  },

  setUserSessionRatings: (userId, ratings) => {
    const result = firebase.database()
      .ref(`/ratings/${userId}`)
      .set(ratings);

    console.log(`setUserSessionRatings ${userId} ${JSON.stringify(ratings)}`);

    result
      .then(() => {
        store.dispatch({
          type: SET_USER_SESSION_RATINGS,
          ratings
        });
      });

    return result;
  }
};

const userActions = {
  signIn: (providerName) => {
    const firebaseProvider = helperActions.getFederatedProvider(providerName);

    return firebase.auth()
      .signInWithPopup(firebaseProvider)
      .then((signInObject) => {
        if (navigator.credentials) {
          const cred = new FederatedCredential({
            id: signInObject.user.email || signInObject.user.providerData[0].email,
            name: signInObject.user.displayName,
            iconURL: signInObject.user.photoURL,
            provider: providerName
          });

          navigator.credentials.store(cred);
        }

        helperActions.storeUser(signInObject.user);
        notificationsActions.getToken(true);
      });
  },

  autoSignIn: (providerUrls) => {
    if (typeof firebase === 'undefined')
      return;
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
      helperActions.storeUser(currentUser);
    }
    else {

      if (navigator.credentials) {
        return navigator.credentials.get({
          password: true,
          federated: {
            providers: providerUrls.split(','),
            mediation: 'silent'
          }
        }).then((cred) => {
          (() => {
            if (cred) {
              const provider = helperActions.getFederatedProvider(cred.provider);

              if (!provider) return;

              return firebase.auth().signInWithPopup(provider)
                .then((signInObject) => {
                  helperActions.storeUser(signInObject.user);
                });
            } else {
              firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                  helperActions.storeUser(user)
                }
              });
              firebase.auth().signInAnonymously().catch(function(error) {
                // Handle Errors here.
                // var errorCode = error.code;
                // var errorMessage = error.message;
              });
            }
          })();
        });
      }
    }
  },

  signOut: () => {
    return firebase.auth()
      .signOut()
      .then(() => {
        helperActions.storeUser();
        subscribeActions.resetSubscribed();

        if (navigator.credentials) {
          navigator.credentials.preventSilentAccess();
        }
      });
  }
};

const subscribeActions = {
  subscribe: (data) => {
    const id = data.email.replace(/[^\w\s]/gi, '');

    firebase.database().ref(`subscribers/${id}`).set({
      email: data.email,
      firstName: data.firstName || '',
      lastName: data.lastName || ''
    })
      .then(() => {
        store.dispatch({
          type: SUBSCRIBE,
          subscribed: true
        });
      })
      .catch(() => {
        store.dispatch({
          type: SET_DIALOG_DATA,
          dialog: {
            ['subscribe']: {
              isOpened: true,
              data: Object.assign(data, { errorOcurred: true })
            }
          }
        });

        store.dispatch({
          type: SUBSCRIBE,
          subscribed: false
        });
      });
  },
  resetSubscribed: () => {
    store.dispatch({
      type: SUBSCRIBE,
      subscribed: false
    });
  }
};

let messaging;
const notificationsActions = {
  initializeMessaging: () => {
    return new Promise(resolve => {
      messaging = firebase.messaging();
      messaging.onMessage(({ notification }) => {
        toastActions.showToast({
          message: `${notification.title} ${notification.body}`,
          action: {
            title: '{$ notifications.toast.title $}',
            callback: () => {
              routingActions.setLocation(notification.click_action);
            }
          }
        });
      });
      messaging.onTokenRefresh(() => {
        notificationsActions.getToken(true);
      });
      resolve(messaging);
    });
  },
  requestPermission: () => {
    return messaging.requestPermission()
      .then(() => {
        notificationsActions.getToken(true);
      })
      .catch(error => {
        console.log('Unable to get permission to notify.', error);
        store.dispatch({
          type: UPDATE_NOTIFICATIONS_STATUS,
          status: NOTIFICATIONS_STATUS.DENIED
        });
      });
  },

  getToken: subscribe => {
    return messaging.getToken()
      .then(currentToken => {
        if (currentToken) {
          const state = store.getState();
          const subscribersRef = firebase.database().ref(`/notifications/subscribers/${currentToken}`);
          const subscribersPromise = subscribersRef.once('value');
          const userUid = state.user && (state.user.uid || null);

          let userSubscriptionsPromise = Promise.resolve(null);
          let userSubscriptionsRef;
          if (userUid) {
            userSubscriptionsRef = firebase.database().ref(`/notifications/users/${userUid}/${currentToken}`);
            userSubscriptionsPromise = userSubscriptionsRef.once('value');
          }

          Promise.all([subscribersPromise, userSubscriptionsPromise])
            .then(([subscribersSnapshot, userSubscriptionsSnapshot]) => {
              const isDeviceSubscribed = subscribersSnapshot.val();
              const isUserSubscribed = userSubscriptionsSnapshot ? userSubscriptionsSnapshot.val() : false;

              if (isDeviceSubscribed) {
                store.dispatch({
                  type: UPDATE_NOTIFICATIONS_STATUS,
                  status: NOTIFICATIONS_STATUS.GRANTED,
                  token: currentToken
                });
                if (userUid && !isUserSubscribed) {
                  userSubscriptionsRef.set(userUid);
                }
              } else if (!isDeviceSubscribed && subscribe) {
                subscribersRef.set(true);
                userUid && userSubscriptionsRef.set(true);
                store.dispatch({
                  type: UPDATE_NOTIFICATIONS_STATUS,
                  status: NOTIFICATIONS_STATUS.GRANTED,
                  token: currentToken
                });
              }
            });
        } else {
          store.dispatch({
            type: UPDATE_NOTIFICATIONS_STATUS,
            status: Notification.permission,
            token: null
          });
        }
      })
      .catch(() => {
        store.dispatch({
          type: UPDATE_NOTIFICATIONS_STATUS,
          status: NOTIFICATIONS_STATUS.DENIED,
          token: null
        });
      });
  },

  unsubscribe: token => {
    return messaging.deleteToken(token)
      .then(() => {
        store.dispatch({
          type: UPDATE_NOTIFICATIONS_STATUS,
          status: NOTIFICATIONS_STATUS.DEFAULT,
          token: null
        });
      });
  }
};

const helperActions = {
  storeUser: (user) => {
    let userToStore = { signedIn: false };

    if (user) {
      const { uid, displayName, photoURL, refreshToken, isAnonymous } = user;
      const email = user.isAnonymous ? null : (user.email || user.providerData[0].email);

      userToStore = {
        signedIn: true,
        uid,
        email,
        displayName,
        photoURL,
        refreshToken,
        isAnonymous
      };
    }

    store.dispatch({
      type: SIGN_IN,
      user: userToStore
    });
  },

  getFederatedProvider: (provider) => {
    switch (provider) {
      case 'https://accounts.google.com':
        return new firebase.auth.GoogleAuthProvider();
      case 'https://www.facebook.com': {
        let provider = new firebase.auth.FacebookAuthProvider();
        provider.addScope('email');
        provider.addScope('public_profile');
        return provider;
      }
      case 'https://twitter.com':
        return new firebase.auth.TwitterAuthProvider();
    }
  }
};

