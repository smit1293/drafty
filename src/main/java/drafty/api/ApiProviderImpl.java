package drafty.api;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.URL;
import java.nio.charset.Charset;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Random;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.sql.DataSource;

import com.google.common.base.Predicate;
import com.google.common.collect.Collections2;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import drafty._MainUI;
import drafty.experiments.PopUp;
import drafty.models.ActiveMode;
import drafty.models.CellSelection;
import drafty.models.DraftyNotification;
import drafty.models.Professors;
import drafty.models.Profile;
import drafty.services.UserInterestService;

/**
 * A dummy implementation for the backend API.
 */
public class ApiProviderImpl implements ApiProvider {

    //private static Random rand = new Random();

    //Can add future feature for notifications
    private final Collection<DraftyNotification> notifications = null;	

    private Profile profile = new Profile();
    private Professors professors = new Professors();
    private ActiveMode activeMode = new ActiveMode();
    private CellSelection cellSelection = new CellSelection();
    private UserInterestService uiService; //create when 
    private PopUp expPopUp = new PopUp();
    
    /**
     * Initialize the data for this application.
     */
    public ApiProviderImpl() {
        
    }
    
    @Override
    public PreparedStatement getConnStmt(String sql) {
		Connection conn = null;
		PreparedStatement stmt = null;
		
		try {
			Context initialContext = new InitialContext();
	      
			DataSource datasource = (DataSource)initialContext.lookup(getJNDI());
			if (datasource != null) {
				conn = datasource.getConnection();
				stmt = conn.prepareStatement(sql);
	        }
	    } catch (Exception ex) {
        	System.out.println("Exception Connection: " + ex);
        }
		
		return stmt;
	}
    
    /* JSON utility method */
    private static String readAll(Reader rd) throws IOException {
        StringBuilder sb = new StringBuilder();
        int cp;
        while ((cp = rd.read()) != -1) {
            sb.append((char) cp);
        }
        return sb.toString();
    }

    /* JSON utility method */
    @SuppressWarnings("unused")
	private static JsonObject readJsonFromUrl(String url) throws IOException {
        InputStream is = new URL(url).openStream();
        try {
            BufferedReader rd = new BufferedReader(new InputStreamReader(is,
                    Charset.forName("UTF-8")));
            String jsonText = readAll(rd);
            JsonElement jelement = new JsonParser().parse(jsonText);
            JsonObject jobject = jelement.getAsJsonObject();
            return jobject;
        } finally {
            is.close();
        }
    }

    /* JSON utility method */
    @SuppressWarnings("unused")
	private static JsonObject readJsonFromFile(File path) throws IOException {
        BufferedReader rd = new BufferedReader(new FileReader(path));
        String jsonText = readAll(rd);
        JsonElement jelement = new JsonParser().parse(jsonText);
        JsonObject jobject = jelement.getAsJsonObject();
        return jobject;
    }
    
    @Override
    public int getUnreadNotificationsCount() {
        Predicate<DraftyNotification> unreadPredicate = new Predicate<DraftyNotification>() {
            @Override
            public boolean apply(DraftyNotification input) {
                return !input.isRead();
            }
        };
        return Collections2.filter(notifications, unreadPredicate).size();
    }

    @Override
    public Collection<DraftyNotification> getNotifications() {
        for (DraftyNotification notification : notifications) {
            notification.setRead(true);
        }
        return Collections.unmodifiableCollection(notifications);
    }


    @Override
	public String getJNDI() {
		return "java:jboss/datasources/MySqlDS_Drafty";
	}
    
    public List<String> getUniversitiesUSACan() {
		List<String> list = new ArrayList<String>();
		
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(getJNDI());
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = 
	        		"SELECT * FROM UniversityName "
	        		+ "WHERE name LIKE '%- USA%' OR "
	        		+ "name LIKE '%- Canada%' OR "
	        		+ "name LIKE '%(USA)%' OR "
	        		+ "name LIKE '%(Canada%' ";
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        try {
	        	ResultSet rs = stmt.executeQuery();
				while (rs.next()) {
					list.add(rs.getString("name"));
				}
	        } catch (SQLException e) {
				System.out.println("Error: 1 getUniversitiesUSACan(): " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex)
        {
        	System.out.println("Error: 2 getUniversitiesUSACan():  " + ex);
        }	
		
		return list;
	}
	
    public List<String> getUniversities() {
		List<String> list = new ArrayList<String>();
		
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(getJNDI());
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = 
	        		"SELECT name FROM  UniversityName LIMIT 531 OFFSET 1";
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        try {
	        	ResultSet rs = stmt.executeQuery();
				while (rs.next()) {
					list.add(rs.getString("name"));
				}
	        } catch (SQLException e) {
				System.out.println("Error: 1 getUniversities(): " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex)
        {
        	System.out.println("Error: 2 getUniversities():  " + ex);
        }	
		
		return list;
	}
    
    public HashMap<String,String> getDomains() {
		HashMap<String,String> domainToName = new HashMap<String, String>();
		
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(getJNDI());
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = 
	        		"SELECT name,domain FROM UniversityName "
	        		+ "WHERE domain <> ''";
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        try {
	        	ResultSet rs = stmt.executeQuery();
				while (rs.next()) {
					domainToName.put(rs.getString("domain"), rs.getString("name"));
				}
	        } catch (SQLException e) {
				System.out.println("Error: 1 getDomains(): " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex)
        {
        	System.out.println("Error: 2 getDomains():  " + ex);
        }	
		
		return domainToName;
	}
	
    public List<String> getSubfields() {
		List<String> list = new ArrayList<String>();
		
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(getJNDI());
	      
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = "SELECT name FROM  SubfieldName LIMIT 25 OFFSET 1";
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        try {
	        	ResultSet rs = stmt.executeQuery();
				while (rs.next()) {
					list.add(rs.getString("name"));
				}
	        } catch (SQLException e) {
				System.out.println("ERROR api getSubfields(): " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex)
        {
        	System.out.println("Exception checkIpAddress() " + ex);
        }	
		
		return list;
	}
    
    public String getIdSuggestion(String person_id, String value, String column) {
		String idSuggestion = null;
		
		try {
		      Context initialContext = new InitialContext();
		      DataSource datasource = (DataSource)initialContext.lookup(getJNDI());
		      
		      if (datasource != null) {
		        Connection conn = datasource.getConnection();
		        String sql = 
		        		"SELECT count(s.idSuggestion) as exist, s.idSuggestion "
		        		+ "FROM Suggestion s "
		        		+ "INNER JOIN SuggestionType st ON st.idSuggestionType = s.idSuggestionType "
		        		+ "WHERE s.idPerson = ? "
		        		+ "AND INSTR(s.suggestion , ?) > 0 "
		        		+ "AND st.type = ? "
		        		+ "ORDER BY confidence desc "
		        		+ "LIMIT 1";
		        PreparedStatement stmt = conn.prepareStatement(sql);
		        stmt.setString(1, person_id);
		        stmt.setString(2, value);
		        stmt.setString(3, column);
		        
		        //System.out.println("getIdSuggestion():" + sql);
		        //System.out.println(person_id + " - " + value + " - " +  column);
		        
		        try {
		        	ResultSet rs = stmt.executeQuery();
					while (rs.next()) {
						if(!rs.getString("exist").equals("0")) {
							idSuggestion = rs.getString("idSuggestion");
							//System.out.println("getIdSuggestionMaxConf(): person_id = " + person_id + ", value = " + value + ", column = " + column);
						}
					}
		        } catch (SQLException e) {
					System.out.println("ERROR api getIdSuggestion(): " + e.getMessage());
				}
		        conn.close();
		      }
		    }
	        catch (Exception ex)
	        {
	        	System.out.println("Exception" + ex);
	        }
			return idSuggestion;
	}
    
    public String cleanUniversityName(String name) {

		name = name.replaceAll(" - USA", "");
		name = name.replaceAll(" - Canada", "");
		name = name.replaceAll(" (USA)", "");
		name = name.replaceAll(" (Canada)", "");
		
		return name;
	}
    
    @Override
	public int getRandom(int min, int max) {
    	return (new Random().nextInt((max - min) + 1) + min);
    }
    
    @Override
	public UserInterestService getUIService() {
		return uiService;
	}
    
    @Override
	public void setUIService() {
    	uiService = new UserInterestService();
    	//uiService.genUserInterest(idProfile);
    	//uiService.genUserInterest();
	}
    
    @Override
    public String getProfUniversity(String person_id) {
    	String profUniversity = "";
    	
    	try {
    		String sql = 
    				"SELECT suggestion " 
    				+ "FROM Person p "
    				+ "INNER JOIN Suggestion s ON s.idPerson = p.idPerson "
    				+ "WHERE s.idSuggestionType = 2 "
    				+ "AND p.idPerson = ? "
    				+ "ORDER BY s.confidence LIMIT 1 ";
    		
    		PreparedStatement stmt =  getConnStmt(sql);
   			
   			stmt.setString(1, person_id);
   			
   			ResultSet rs = stmt.executeQuery();
   			
   			while(rs.next()) {
   				profUniversity = rs.getString("suggestion");
   			}
   			
   			stmt.getConnection().close();
   			stmt.close();
   			
   		} catch (SQLException e) {
   			System.out.println("ERROR getProfUniversity(): " + e);
   		}
       	
       	return profUniversity;
    }
    
    @Override
   	public String getIdProfessor(String name) {
       	String idProfessor = "";
       	
       	try {
   			String sql =
   					"SELECT * FROM Person WHERE name = ?";
   			
   			PreparedStatement stmt =  getConnStmt(sql);
   			
   			stmt.setString(1, name);
   			
   			ResultSet rs = stmt.executeQuery();
   			
   			while(rs.next()) {
   				idProfessor = rs.getString("idPerson");
   			}
   			
   			stmt.getConnection().close();
   			stmt.close();
   			
   		} catch (SQLException e) {
   			System.out.println("ERROR getIdProfessor(): " + e);
   		}
       	
       	return idProfessor;
   	}
    
    @Override
	public List<String> getAllActiveProfessors() {
    	List<String> professors = new ArrayList<String>();
    	
    	try {
			String sql =
					"SELECT * FROM Person WHERE status = 1";
			
			PreparedStatement stmt =  getConnStmt(sql);
			
			ResultSet rs = stmt.executeQuery();
			
			while(rs.next()) {
				professors.add(rs.getString("name"));
			}
			
			stmt.getConnection().close();
			stmt.close();
			
		} catch (SQLException e) {
			System.out.println("ERROR submitDeactivate(): " + e);
		}
    	
    	return professors;
	}
    
	@Override
	public Professors getProfessors() {
		return professors;
	}
    
    @Override
	public Profile getProfile() {
		return profile;
	}
    
    @Override
    public void setIdProfile(String idProfile) {
    	profile.setIdProfile(idProfile);
    }
    
    @Override
    public String getIdProfile() {
    	return profile.getIdProfile();
    }
    
    private int interactionCount = 0;
    private int interactionScore = 0;
    private int interactionCountTot = 0;
    private int interactionScoreTot = 0;

    @Override
	public int getInteractionCount() {
		return interactionCount;
	}
    @Override
	public void setInteractionCount(int interactionCount) {
		this.interactionCount = interactionCount;
	}
    @Override
	public int getInteractionScore() {
		return interactionScore;
	}
    @Override
	public void setInteractionScore(int interactionScore) {
		this.interactionScore = interactionScore;
	}
    @Override
	public int getInteractionCountTot() {
		return interactionCountTot;
	}
    @Override
	public void setInteractionCountTot(int interactionCountTot) {
		this.interactionCountTot = interactionCountTot;
	}
    @Override
	public void incrementInteractionCountTot() {
		this.interactionCountTot++;
	}
    @Override
	public int getInteractionScoreTot() {
		return interactionScoreTot;
	}
    @Override
	public void setInteractionScoreTot(int interactionScoreTot) {
		this.interactionScoreTot = interactionScoreTot;
	}
    @Override
	public void incrementInteractionScoreTot(int score) {
		this.interactionScoreTot += score;
	}

    private int interactions = 10;
	
    @Override
	public int getIntAsk() {
		return interactions;
	}

	@Override
	public void resetIntAsk() {
		interactions = _MainUI.getApi().getRandom(7, 12);
	}

	@Override
	public CellSelection getCellSelection() {
		return cellSelection;
	}

	@Override
	public drafty.models.ActiveMode getActiveMode() {
		return activeMode;
	}

	@Override
	public PopUp getExpPopUp() {
		return expPopUp;
	}
}
