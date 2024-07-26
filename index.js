const net = require("net");
const tls = require("tls");

class EmailSender {
  constructor({ host, port, secure, user, pass }) {
    this.host = host;
    this.port = port;
    this.secure = secure;
    this.user = user;
    this.pass = pass;
  }

  sendCommand(socket, command, waitFor) {
    return new Promise((resolve, reject) => {
      socket.write(command + "\r\n");
      socket.once("data", (data) => {
        const response = data.toString();
        if (response.startsWith(waitFor)) {
          resolve(response);
        } else {
          reject(response);
        }
      });
    });
  }

  async sendMail({ from, to, subject, text, html }) {
    const socket = this.secure
      ? tls.connect(this.port, this.host)
      : net.createConnection(this.port, this.host);

    socket.setEncoding("utf-8");

    try {
      await this.sendCommand(socket, `HELO ${this.host}`, "250");
      await this.sendCommand(socket, "AUTH LOGIN", "334");
      await this.sendCommand(
        socket,
        Buffer.from(this.user).toString("base64"),
        "334"
      );
      await this.sendCommand(
        socket,
        Buffer.from(this.pass).toString("base64"),
        "235"
      );
      await this.sendCommand(socket, `MAIL FROM:<${from}>`, "250");
      await this.sendCommand(socket, `RCPT TO:<${to}>`, "250");
      await this.sendCommand(socket, "DATA", "354");

      const message = `From: ${from}
      To: ${to}
      Subject: ${subject}
      MIME-Version: 1.0
      Content-Type: text/html; charset="UTF-8"
      
      ${html || text}
      
      `;
      await this.sendCommand(socket, message, "250");
      await this.sendCommand(socket, "QUIT", "221");

      console.log("Email sent successfully");
    } catch (error) {
      console.error("Error sending email:", error);
    } finally {
      socket.end();
    }
  }
}

module.exports = EmailSender;
