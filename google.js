
const googleapis = require('googleapis')
const jsonfile = require('jsonfile')

class Google {

	constructor(clientSecretPath, gdriveTokenPath) {

		this.clientSecret = jsonfile.readFileSync(clientSecretPath).installed
		this.gDriveToken = jsonfile.readFileSync(gdriveTokenPath)
		this.gdriveTokenPath = gdriveTokenPath

		this.oauth2Client = new googleapis.google.auth.OAuth2(this.clientSecret.client_id,
			this.clientSecret.client_secret,
			this.clientSecret.redirect_uris[0])

	}

	async selectAuth() {

		try {

			this.oauth2Client.setCredentials(this.gDriveToken)
			this.oauth2Client.forceRefreshOnFailure = true
			if (this.oauth2Client.isTokenExpiring()) {

				console.log('Token expiring, refreshing...')

				await this.oauth2Client.refreshAccessToken()
				const tokensRefreshed = this.oauth2Client.credentials

				this.gDriveToken.access_token = tokensRefreshed.access_token
				this.gDriveToken.expiry_date = tokensRefreshed.expiry_date

				jsonfile.writeFileSync(this.gdriveTokenPath, this.gDriveToken)
				this.oauth2Client.setCredentials(this.gDriveToken)

				console.log('Gdrive token refreshed and updated!')

			}

			return this.oauth2Client

		} catch (err) {

			console.log(`Error on Google - selectAuth: ${err}`)

		}

	}

}

module.exports = Google
