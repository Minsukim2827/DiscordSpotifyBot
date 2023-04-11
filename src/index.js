const spotifyApi = require("spotify-web-api-node");
require("dotenv").config();

const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
// Create a new Discord bot client and a new Spotify API client
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

// Set up the Spotify API client
const spotifyClient = new spotifyApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Authenticate with the Spotify API using client credentials flow
spotifyClient.clientCredentialsGrant().then(
    function (data) {
        console.log(
            "Successfully authenticated with Spotify API. Access token expires in " +
                data.body["expires_in"] +
                " seconds."
        );
        spotifyClient.setAccessToken(data.body["access_token"]);
    },
    function (err) {
        console.log(
            "Failed to authenticate with Spotify API. Error message: " +
                err.message
        );
    }
);

client.on("ready", (c) => {
    console.log(`${c.user.tag} is online.`);
});

client.on("messageCreate", async (message) => {
    //check if author of message is bot
    if (message.author.bot) {
        return;
    }

    // Check if the message starts with the command prefix
    if (!message.content.startsWith("!")) {
        return;
    }

    //we use slice so that the !recommend command is not case sensitive
    let args = message.content.slice(1).trim().split(/ +/);
    const command = args[0].toLowerCase();

    if (command === "recommend") {
        try {
            // Get the Spotify link from the command arguments
            const spotifyLink = args[1];

            // Extract the Spotify track ID from the link
            let trackId = spotifyLink.split("/").pop();

            // Get the audio features of the track
            const trackFeatures = await spotifyClient.getAudioFeaturesForTrack(
                trackId
            );

            if (trackId.includes("?")) {
                const trackidArray = trackId.split("?");
                trackId = trackidArray[0];
            }

            // Get the recommendations based on the audio features of the track
            const recommendations = await spotifyClient.getRecommendations({
                seed_tracks: [trackId],
                target_energy: trackFeatures.body.energy,
                target_valence: trackFeatures.body.valence,
            });
            // Create a list of the recommended tracks with hyperlinks to their URLs
            const recommendedTrackList = recommendations.body.tracks
                .slice(1, 6)
                .map(
                    (track) =>
                        `Track Name: ${track.name}\nLink: ${track.external_urls.spotify}`
                )
                .join("\n");

            // Send the recommended track list with hidden URLs to the Discord channel
            message.channel.send(
                `Recommended tracks:\n${recommendedTrackList}`
            );

            // // Extract the names of the recommended tracks
            // const recommendedTrackNames = recommendations.body.tracks
            //     .slice(0, 5)
            //     .map((track) => track.external_urls.spotify);

            // // Send the recommended track names to the Discord channel
            // message.channel.send(
            //     `Recommended tracks: ${recommendedTrackNames.join("\n")}`
            // );

            // // Create a new embed for the message
            // const embed = new EmbedBuilder()
            //     .setTitle("Recommended tracks")
            //     .setColor("#1DB954");

            // // Add fields to the embed for each recommended track
            // recommendations.body.tracks.slice(0, 5).forEach((track) => {
            //     const imageUrl = track.album.images[0].url;
            //     embed.addFields({
            //         name: track.name,
            //         value: `[Listen on Spotify](https://open.spotify.com/track/${track.id})`,
            //         iconURL: imageUrl,
            //     });
            // });

            // // Send the embed to the Discord channel
            // message.channel.send({ embeds: [embed] });
        } catch (e) {
            console.log("Error occurred while getting recommendations:", e);
            message.channel.send(
                "An error occurred while getting recommendations. Please try again later."
            );
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
