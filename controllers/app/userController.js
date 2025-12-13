const jwt = require("jsonwebtoken");
const generic = require("../../config/genricFn/common");
const { validationResult, matchedData } = require("express-validator");
const User = require("../../models/userModel");
const db = require("../../config/db")
const moment = require("moment")
const fs = require("fs");
const handlebars = require("handlebars");
const path = require("path")

exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    req.body.email = req.body.email.toLowerCase()
    const regex = /^[a-zA-Z0-9._%+-]+@kps\.ca$/;
    const isValidEmail = regex.test(req.body.email);
    if (!isValidEmail) {
      return generic.error(req, res, {
        message: `${req.body.email} :- Invalid email. Only emails from the domain 'kps.ca' are allowed`,
      });
    }
    const existingUser = await User.checkExistingUser({ filter: { email: req.body.email } })
    req.body.password = await generic.encodeToBase64(req.body.password)
    if (existingUser.length) {
      if (existingUser[0]?.username !== null && existingUser[0]?.password !== null) {
        db.connection.rollback()
        return generic.success(req, res, {
          message: `${req.body.username} is already registered`,
        });
      }
      req.body.id = existingUser[0]?.id
      req.body.dateTime = req.header("dateTime") ? moment.utc(req.header("dateTime")).format('YYYY-MM-DD HH:mm:ss') : moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss')
      const updateUserDetails = await User.updateUserDetails(req.body)
      if (updateUserDetails.affectedRows) {
        db.connection.commit()
        return generic.success(req, res, {
          message: `${req.body.username} registered successfully`,
          data: {
            id: req.body.id
          },
        });

      } else {
        db.connection.rollback()
        return generic.error(req, res, {
          message: `${req.body.username}'s registeration failed`
        });
      }

    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: `${req.body.email} :- this company email is not registered kindly contact to support team`,
      });
    }
  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.updateLocation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }

  try {
    db.connection.beginTransaction()
    const checkExistingUser = await User.checkExistingUser(req.body);
    if (!checkExistingUser.length) {
      return generic.error(req, res, { message: `User not found` });
    }
    const updateUserLocation = await User.updateUserLocation(req.body)
    if (updateUserLocation.affectedRows) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "User location updated successfully",
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "failed to update user location"
      });
    }
  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    req.body.email = req.body.email.toLowerCase()
    const regex = /^[a-zA-Z0-9._%+-]+@kps\.ca$/;
    const isValidEmail = regex.test(req.body.email);
    if (!isValidEmail) {
      return generic.error(req, res, {
        message: `${req.body.email} :- Invalid email. Only emails from the domain 'kps.ca' are allowed`,
      });
    }
    const checkExistingUser = await User.checkExistingUser({ filter: { email: req.body.email } })
    if (checkExistingUser.length) {
      if (checkExistingUser[0]?.username == null && checkExistingUser[0]?.password == null) {
        return generic.error(req, res, {
          message: `You have to registered first`,
        });
      }
      const encryptPassword = await generic.encodeToBase64(req.body.password)
      if (encryptPassword !== checkExistingUser[0]?.password) {
        return generic.error(req, res, {
          message: "Invalid email or password",
        });
      }
      let isBoss = checkExistingUser[0].is_boss == 1 ? true : false

      const token = jwt.sign(
        { userId: checkExistingUser[0].id, isBoss },
        process.env.JWT_SECRET,
        { expiresIn: "720h" },
      );
      return generic.success(req, res, {
        message: "User logged in successfully",
        data: {
          token: token,
          userId: checkExistingUser[0]?.id,
          userName: checkExistingUser[0]?.username ?? '',
          isBoss: isBoss,
          mileage_rate: checkExistingUser[0]?.mileage_rate ?? '',
          allowanceDistance: checkExistingUser[0]?.allowanceDistance ?? ''

        },
      });
    } else {
      return generic.error(req, res, {
        message: `${req.body.email} :- email is not verified by company`,
      });
    }
  } catch (error) {
    console.log('error', error)
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    req.body.email = req.body.email.toLowerCase()
    const user = await User.checkExistingUser({ filter: { email: req.body.email } });
    if (!user) {
      return generic.error(req, res, { message: "User not found" });
    }
    const code = Math.floor(1000 + Math.random() * 9000);
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);

    let updatedCode = {
      id: user[0].id,
      dateTime: req.header("dateTime") ? moment.utc(req.header("dateTime")).format('YYYY-MM-DD HH:mm:ss') : moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      verificationCode: code,
      codeExpiration: expiration
    }
    let updateCodeDetails = await User.updateCodeDetails(updatedCode)
    if (updateCodeDetails.affectedRows) {
      const emailTemplatePath = path.join(
        __dirname,
        "../../view/forgetPasswordTemplate.html",
      );
      const emailTemplateSource = fs.readFileSync(emailTemplatePath, "utf8");
      const emailTemplate = handlebars.compile(emailTemplateSource);
      const emailHTML = emailTemplate({code:code});
      let data = {
        to: user?.[0]?.email,
        cc: '',
        bcc: '',
        subject: `Password Reset Verification Code`,
        html: emailHTML,
      };
      let result = await generic.sendEmails(data);
      if (result) {
        db.connection.commit()
        return generic.success(req, res, {
          message: "Verification code sent to email",
        });
      } else {
        db.connection.rollback()
        return generic.error(req, res, {
          message: "failed to send forgot password code mail",
          error: result,
        });
      }
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "failed to update user code details",
      });
    }
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.verifyCode = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    req.body.email = req.body.email.toLowerCase()
    const user = await User.checkExistingUser({ filter: { email: req.body.email } });
    if (!user.length) {
      return generic.error(req, res, { message: "User not found" });
    }

    if (user[0].verificationCode !== req.body.code) {
      return generic.error(req, res, {
        message: "Invalid code",
        error: "Invalid code",
      });
    }

    if (new Date() > user[0].codeExpiration) {
      return generic.error(req, res, {
        message: "Code has expired",
        error: "Code has expired",
      });
    }
    return generic.success(req, res, {
      message: "Code verified successfully",
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    req.body.email = req.body.email.toLowerCase()
    const user = await User.checkExistingUser({ filter: { email: req.body.email } });
    if (!user.length) {
      return generic.error(req, res, { message: "User not found" });
    }

    if (req.body.newPassword.length < 8) {
      return generic.error(req, res, {
        message: "Password must be at least 8 characters long",
      });
    }

    const encryptPassword = await generic.encodeToBase64(req.body.newPassword)
    let data = {
      id: user[0].id,
      dateTime: req.header("dateTime") ? moment.utc(req.header("dateTime")).format('YYYY-MM-DD HH:mm:ss') : moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss'),
      password: encryptPassword
    }
    let updateUserPassword = await User.updateUserPassword(data)
    if (updateUserPassword.affectedRows) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "Password reset successfully ",
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "failed to reset user password",
      });

    }

  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.profile = async (req, res) => {
  try {
    const user = await User.checkExistingUser({ userId: req.body.user.userId });
    if (!user.length) {
      return generic.error(req, res, { message: "User not found" });
    }
    const isBoss = req.body.user.isBoss;
    return generic.success(req, res, {
      message: "Login user profile details",
      data: {
        username: user[0].username,
        email: user[0].email,
        isBoss: isBoss,
        latitude: user[0].latitude ?? '',
        longitude: user[0].longitude ?? '',
      },
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    if (req.body.currentPassword == req.body.newPassword) {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "New password must be different from the previous one",
      });
    }
    req.body.password = await generic.encodeToBase64(req.body.currentPassword)
    let checkPrevPass = await User.checkExistingUser({ filter: { password: req.body.password, userId: req.body.user.userId } })

    if (checkPrevPass.length) {
      if (req.body.password == checkPrevPass[0]?.password) {
        let newPassword = await generic.encodeToBase64(req.body.newPassword)
        let data = {
          id: checkPrevPass[0]?.id,
          dateTime: req.body.user.dateTime,
          password: newPassword,
        }
        let updateUserPassword = await User.updateUserPassword(data)
        if (updateUserPassword.affectedRows) {
          db.connection.commit()
          return generic.success(req, res, {
            message: "Password updated successfully",
          });

        } else {
          db.connection.rollback()
          return generic.error(req, res, {
            message: "Failed to update user password",
          });

        }

      } else {
        db.connection.rollback()
        return generic.error(req, res, {
          message: "Current password does'nt match with the previous password",
        });

      }
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Your password is incorrect",
      });

    }
  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.addUserDetails = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    req.body.email = req.body.email.toLowerCase()
    const regex = /^[a-zA-Z0-9._%+-]+@kps\.ca$/;
    const isValidEmail = regex.test(req.body.email);
    if (!isValidEmail) {
      return generic.error(req, res, {
        message: `${req.body.email} :- Invalid email. Only emails from the domain 'kps.ca' are allowed`,
      });
    }
    const user = await User.checkExistingUser({ filter: { email: req.body.email } });
    if (user.length) {
      return generic.error(req, res, { message: `User with ${req.body.email} already exists ` });
    }
    let addUserDetails = await User.addUserDetails(req.body)
    if (addUserDetails.insertId) {
      db.connection.commit()
      return generic.success(req, res, {
        message: `Email ${req.body.email} added successfully`,
        data: {
          id: addUserDetails.insertId
        },
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: `Failed to add ${req.body.email}`
      });
    }
  } catch (error) {
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "Something went wrong !"
    });
  }
};
exports.updateBossPermission = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const x = matchedData(req);
    return generic.validationError(req, res, {
      message: "Needs to fill required input fields",
      validationObj: errors.mapped(),
    });
  }
  try {
    db.connection.beginTransaction()
    const updateBossPermission = await User.updateBossPermission(req.body);
    if (updateBossPermission.affectedRows) {
      db.connection.commit()
      return generic.success(req, res, {
        message: "Boss permission updated successfully",
      });
    } else {
      db.connection.rollback()
      return generic.error(req, res, {
        message: "Failed to update boss permission",
      });
    }
  } catch (error) {
    console.log('error', error)
    db.connection.rollback()
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
exports.getUsersList = async (req, res) => {
  try {
    const getUsersList = await User.checkExistingUser(req.body);
    return generic.success(req, res, {
      message: "Users list.",
      data: getUsersList,
    });
  } catch (error) {
    return generic.error(req, res, {
      status: 500,
      message: "something went wrong!",
    });
  }
};
